from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import os
import json
import sqlite3
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, origins="*")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max upload

# ── Country codes ──
COUNTRIES = {
    "IN":"India","US":"United States","BR":"Brazil","CN":"China",
    "FR":"France","RU":"Russia","GB":"United Kingdom","DE":"Germany",
    "JP":"Japan","AU":"Australia","CA":"Canada","MX":"Mexico",
}
def country_name(code):
    return COUNTRIES.get(str(code).upper(), code)

# ── Paths ──
BASE        = os.path.dirname(os.path.abspath(__file__))
ROOT        = os.path.dirname(BASE)
DATA_PATH   = os.path.join(ROOT, "data", "raw_logs", "cloud_logs.csv")
RF_PATH     = os.path.join(BASE, "ml", "rf_model.pkl")
ENC_PATH    = os.path.join(BASE, "ml", "encoders.pkl")
DB_PATH     = os.path.join(BASE, "database", "forensics.db")
REPORT_PATH = os.path.join(ROOT, "data", "reports.json")
UPLOAD_DIR  = os.path.join(ROOT, "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Required CSV columns ──
REQUIRED_COLS = ["timestamp","user_id","action","file_id","ip_address","location","device","file_size_mb"]

# ── Load ML models ──
try:
    rf       = joblib.load(RF_PATH)
    encoders = joblib.load(ENC_PATH)
    MODEL_OK = True
except Exception as e:
    print(f"[WARN] Model load failed: {e}")
    MODEL_OK = False

# ── Load base data ──
try:
    df = pd.read_csv(DATA_PATH)
    df["timestamp"]     = pd.to_datetime(df["timestamp"])
    df["location_full"] = df["location"].apply(country_name)
    DATA_OK = True
except Exception as e:
    print(f"[WARN] Data load failed: {e}")
    df = pd.DataFrame()
    DATA_OK = False

# ── DB helpers ──
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def encode_input(action, location, device, file_size):
    try:
        a = encoders["action"].transform([action])[0]
        l = encoders["location"].transform([location])[0]
        d = encoders["device"].transform([device])[0]
        return np.array([[a, l, d, float(file_size)]])
    except:
        return None

def load_reports():
    if os.path.exists(REPORT_PATH):
        with open(REPORT_PATH) as f:
            return json.load(f)
    return []

def save_report(report):
    reports = load_reports()
    reports.insert(0, report)
    with open(REPORT_PATH, "w") as f:
        json.dump(reports[:100], f, indent=2)
    # Also save to SQLite
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO reports (timestamp,action,location,location_full,device,file_size_mb,risk_score,risk_level,label,recommendation) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (report["timestamp"],report["action"],report["location"],report["location_full"],
             report["device"],report["file_size_mb"],report["risk_score"],report["risk_level"],
             report["label"],report["recommendation"])
        )
        conn.commit()
        conn.close()
    except:
        pass

def get_active_df():
    """Get current working dataframe from SQLite"""
    try:
        conn = get_db()
        result = pd.read_sql("SELECT * FROM forensic_logs ORDER BY timestamp DESC", conn)
        conn.close()
        if not result.empty:
            result["location_full"] = result["location"].apply(country_name)
        return result
    except:
        return df

# ══════════════════════════════
#  ROUTES
# ══════════════════════════════

@app.route("/api/health")
def health():
    active = get_active_df()
    return jsonify({
        "status":       "ok",
        "model_loaded": MODEL_OK,
        "data_loaded":  DATA_OK,
        "total_records": len(active)
    })

@app.route("/api/stats")
def stats():
    active = get_active_df()
    if active.empty:
        return jsonify({"error":"No data"}), 500
    anomaly_df = active[active["is_anomaly"]==1]
    risk_by_loc = active.groupby("location")["is_anomaly"].mean().round(3)
    return jsonify({
        "total_events":      int(len(active)),
        "anomalies":         int(anomaly_df.shape[0]),
        "normal":            int(active[active["is_anomaly"]==0].shape[0]),
        "detection_rate":    round(anomaly_df.shape[0]/len(active)*100, 2),
        "top_actions":       active["action"].value_counts().head(6).to_dict(),
        "risk_by_location":  {country_name(k):round(float(v),3) for k,v in risk_by_loc.items()},
        "events_by_location":{country_name(k):int(v) for k,v in active["location"].value_counts().items()},
        "anomaly_by_action": anomaly_df["action"].value_counts().to_dict(),
    })

@app.route("/api/logs")
def get_logs():
    active = get_active_df()
    if active.empty:
        return jsonify({"logs":[],"total":0})

    page           = int(request.args.get("page", 1))
    per_page       = int(request.args.get("per_page", 50))
    search         = request.args.get("search","").lower()
    filter_anomaly = request.args.get("anomaly","")

    result = active.copy()
    result["timestamp"]     = result["timestamp"].astype(str)
    result["location_full"] = result["location"].apply(country_name)

    if search:
        mask = (
            result["user_id"].str.lower().str.contains(search, na=False) |
            result["action"].str.lower().str.contains(search, na=False) |
            result["location"].str.lower().str.contains(search, na=False) |
            result["location_full"].str.lower().str.contains(search, na=False) |
            result["ip_address"].str.lower().str.contains(search, na=False) |
            result["file_id"].str.lower().str.contains(search, na=False)
        )
        result = result[mask]

    if filter_anomaly == "1":
        result = result[result["is_anomaly"]==1]
    elif filter_anomaly == "0":
        result = result[result["is_anomaly"]==0]

    total   = len(result)
    start   = (page-1)*per_page
    page_df = result.iloc[start:start+per_page].copy()

    return jsonify({
        "logs":     page_df.to_dict(orient="records"),
        "total":    total,
        "page":     page,
        "per_page": per_page,
        "pages":    (total+per_page-1)//per_page
    })

# ── REAL FILE UPLOAD ──
@app.route("/api/upload", methods=["POST"])
def upload_logs():
    if "file" not in request.files:
        return jsonify({"error":"No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error":"No file selected"}), 400
    if not file.filename.endswith(".csv"):
        return jsonify({"error":"Only CSV files are supported"}), 400

    try:
        # Read uploaded CSV
        uploaded_df = pd.read_csv(file)

        # Validate required columns
        missing = [c for c in REQUIRED_COLS if c not in uploaded_df.columns]
        if missing:
            return jsonify({
                "error": f"Missing columns: {', '.join(missing)}",
                "required": REQUIRED_COLS,
                "found": list(uploaded_df.columns)
            }), 400

        # Clean data
        uploaded_df = uploaded_df.dropna(subset=["action","location","device"])
        uploaded_df["file_size_mb"] = pd.to_numeric(uploaded_df["file_size_mb"], errors="coerce").fillna(0)
        uploaded_df["location_full"] = uploaded_df["location"].apply(country_name)

        # Auto-score with ML if is_anomaly not present
        scored = 0
        if "is_anomaly" not in uploaded_df.columns:
            uploaded_df["is_anomaly"] = 0
            if MODEL_OK:
                for idx, row in uploaded_df.iterrows():
                    X = encode_input(row["action"], row["location"], row["device"], row["file_size_mb"])
                    if X is not None:
                        prob = float(rf.predict_proba(X)[0][1])
                        uploaded_df.at[idx, "is_anomaly"] = 1 if prob > 0.5 else 0
                        scored += 1

        # Save uploaded file
        filename = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{secure_filename(file.filename)}"
        save_path = os.path.join(UPLOAD_DIR, filename)
        uploaded_df.to_csv(save_path, index=False)

        # Insert into SQLite database
        conn = get_db()

        # Ensure table exists
        conn.execute("""CREATE TABLE IF NOT EXISTS forensic_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT, user_id TEXT, action TEXT,
            file_id TEXT, ip_address TEXT, location TEXT,
            location_full TEXT, device TEXT,
            file_size_mb REAL, is_anomaly INTEGER
        )""")

        inserted = 0
        for _, row in uploaded_df.iterrows():
            try:
                conn.execute(
                    "INSERT INTO forensic_logs (timestamp,user_id,action,file_id,ip_address,location,location_full,device,file_size_mb,is_anomaly) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (
                        str(row.get("timestamp","")),
                        str(row.get("user_id","")),
                        str(row.get("action","")),
                        str(row.get("file_id","")),
                        str(row.get("ip_address","")),
                        str(row.get("location","")),
                        str(row.get("location_full","")),
                        str(row.get("device","")),
                        float(row.get("file_size_mb",0)),
                        int(row.get("is_anomaly",0))
                    )
                )
                inserted += 1
            except:
                pass

        conn.commit()
        conn.close()

        anomalies = int(uploaded_df["is_anomaly"].sum())

        return jsonify({
            "success":   True,
            "message":   f"Successfully uploaded {inserted} log records",
            "total_rows": len(uploaded_df),
            "inserted":  inserted,
            "anomalies_detected": anomalies,
            "auto_scored": scored,
            "filename":  filename,
        })

    except Exception as e:
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500

@app.route("/api/upload/template")
def download_template():
    """Download a sample CSV template"""
    sample = """timestamp,user_id,action,file_id,ip_address,location,device,file_size_mb,is_anomaly
2026-01-01 10:00:00,user_1,upload,file_1,192.168.1.1,IN,Chrome/Windows,12.5,0
2026-01-01 10:05:00,user_2,bulk_download,file_2,190.233.50.1,BR,Firefox/Linux,450.0,1
2026-01-01 10:10:00,user_3,login,file_3,85.14.202.53,RU,Edge/Windows,0.1,1
2026-01-01 10:15:00,user_4,share,file_4,74.125.224.1,US,Safari/Mac,5.2,0
2026-01-01 10:20:00,user_5,download,file_5,103.21.244.1,IN,Chrome/Windows,25.0,0"""
    response = make_response(sample)
    response.headers["Content-Disposition"] = "attachment; filename=cloud_logs_template.csv"
    response.headers["Content-Type"] = "text/csv"
    return response

@app.route("/api/predict", methods=["POST"])
def predict():
    if not MODEL_OK:
        return jsonify({"error":"Model not loaded"}), 503
    data      = request.json or {}
    action    = data.get("action","")
    location  = data.get("location","")
    device    = data.get("device","")
    file_size = data.get("file_size_mb", 0)
    X = encode_input(action, location, device, file_size)
    if X is None:
        return jsonify({"error":"Invalid input — check action/location/device values"}), 400
    prob  = float(rf.predict_proba(X)[0][1])
    label = "anomaly" if prob > 0.5 else "normal"
    level = "HIGH" if prob > 0.7 else "MEDIUM" if prob > 0.4 else "LOW"
    result = {
        "risk_score":    round(prob, 4),
        "label":         label,
        "risk_level":    level,
        "action":        action,
        "location":      location,
        "location_full": country_name(location),
        "device":        device,
        "file_size_mb":  file_size,
        "timestamp":     datetime.now().isoformat(),
        "recommendation":(
            "Immediate investigation required — block user session" if prob>0.7 else
            "Monitor closely — flag for review" if prob>0.4 else
            "Normal activity — no action needed"
        )
    }
    save_report(result)
    return jsonify(result)

@app.route("/api/simulate", methods=["POST"])
def simulate():
    import random
    from faker import Faker
    fake = Faker()
    ACTIONS   = ["upload","download","share","login","bulk_download","permission_change"]
    LOCATIONS = ["IN","US","BR","CN","FR","RU"]
    DEVICES   = ["Chrome/Windows","Firefox/Linux","Safari/Mac","Edge/Windows"]
    results = []
    for _ in range(10):
        action   = random.choice(ACTIONS)
        location = random.choice(LOCATIONS)
        device   = random.choice(DEVICES)
        size     = round(random.uniform(0.1,500),2)
        X = encode_input(action, location, device, size)
        if X is not None:
            prob  = float(rf.predict_proba(X)[0][1])
            label = "anomaly" if prob>0.5 else "normal"
            results.append({
                "user_id":       f"user_{random.randint(1,20)}",
                "action":        action,
                "location":      location,
                "location_full": country_name(location),
                "device":        device,
                "file_size_mb":  size,
                "ip_address":    fake.ipv4(),
                "risk_score":    round(prob,4),
                "label":         label,
                "timestamp":     datetime.now().isoformat()
            })
    return jsonify({"simulated":results,"count":len(results)})

@app.route("/api/reports")
def get_reports():
    return jsonify(load_reports())

@app.route("/api/reports/clear", methods=["DELETE"])
def clear_reports():
    if os.path.exists(REPORT_PATH):
        os.remove(REPORT_PATH)
    try:
        conn = get_db()
        conn.execute("DELETE FROM reports")
        conn.commit()
        conn.close()
    except:
        pass
    return jsonify({"status":"cleared"})

@app.route("/api/reports/download")
def download_report():
    reports = load_reports()
    active  = get_active_df()
    now     = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines   = []
    lines.append("="*65)
    lines.append("     CLOUD STORAGE FORENSICS - ANALYSIS REPORT")
    lines.append(f"     Generated: {now}")
    lines.append("="*65)
    lines.append("")
    if not active.empty:
        anomaly_count = int(active["is_anomaly"].sum())
        lines.append("EXECUTIVE SUMMARY")
        lines.append("-"*40)
        lines.append(f"  Total Events Analyzed : {len(active)}")
        lines.append(f"  Anomalies Detected    : {anomaly_count}")
        lines.append(f"  Normal Events         : {len(active)-anomaly_count}")
        lines.append(f"  Detection Rate        : {round(anomaly_count/len(active)*100,2)}%")
        lines.append(f"  ML Model              : Random Forest (Accuracy: 82%)")
        lines.append(f"  Database              : SQLite (forensics.db)")
        lines.append("")
    lines.append("FORENSIC ANALYSIS RESULTS")
    lines.append("-"*40)
    if not reports:
        lines.append("  No analysis results recorded yet.")
    else:
        for i,r in enumerate(reports[:20],1):
            lines.append(f"\n  [{i}] Analysis Result")
            lines.append(f"      Timestamp      : {r.get('timestamp','')[:19]}")
            lines.append(f"      Risk Score     : {r.get('risk_score','')}")
            lines.append(f"      Risk Level     : {r.get('risk_level','')}")
            lines.append(f"      Verdict        : {r.get('label','').upper()}")
            lines.append(f"      Action         : {r.get('action','')}")
            lines.append(f"      Country        : {r.get('location_full',r.get('location',''))}")
            lines.append(f"      Device         : {r.get('device','')}")
            lines.append(f"      File Size      : {r.get('file_size_mb','')} MB")
            lines.append(f"      Recommendation : {r.get('recommendation','')}")
    lines.append("")
    lines.append("="*65)
    lines.append("RISK BY COUNTRY")
    lines.append("-"*40)
    if not active.empty:
        risk_by_loc = active.groupby("location")["is_anomaly"].mean().sort_values(ascending=False)
        for code,risk in risk_by_loc.items():
            lines.append(f"  {country_name(code):<25} {round(risk*100,1)}% anomaly rate")
    lines.append("")
    lines.append("="*65)
    lines.append("TOP ACTIONS")
    lines.append("-"*40)
    if not active.empty:
        for action,count in active["action"].value_counts().items():
            rate = active[active["action"]==action]["is_anomaly"].mean()
            lines.append(f"  {action:<25} {count} events  ({round(rate*100,1)}% anomaly rate)")
    lines.append("")
    lines.append("="*65)
    lines.append("END OF REPORT - Cloud Storage Forensics System")
    lines.append("="*65)
    content  = "\n".join(lines)
    filename = f"forensics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    response = make_response(content)
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    response.headers["Content-Type"] = "text/plain"
    return response

if __name__ == "__main__":
    print("="*50)
    print(f"  Model loaded : {MODEL_OK}")
    print(f"  Data loaded  : {DATA_OK} ({len(df)} records)")
    print(f"  API running  : http://localhost:5000")
    print("="*50)
    app.run(host="0.0.0.0", port=5000, debug=True)