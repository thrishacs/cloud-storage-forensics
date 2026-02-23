from flask import Blueprint, jsonify
import pandas as pd

stats_bp = Blueprint("stats", __name__)
df = pd.read_csv("data/raw_logs/cloud_logs.csv")

@stats_bp.route("/api/stats")
def stats():
    return jsonify({
        "total_events": len(df),
        "anomalies": int(df["is_anomaly"].sum()),
        "top_actions": df["action"].value_counts().head(5).to_dict(),
        "risk_by_location": df.groupby("location")["is_anomaly"].mean().round(3).to_dict()
    })
