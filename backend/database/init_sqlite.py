import sqlite3
import pandas as pd
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "forensics.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # Forensic logs table
    cur.execute("""CREATE TABLE IF NOT EXISTS forensic_logs (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp     TEXT,
        user_id       TEXT,
        action        TEXT,
        file_id       TEXT,
        ip_address    TEXT,
        location      TEXT,
        device        TEXT,
        file_size_mb  REAL,
        is_anomaly    INTEGER,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    # Reports table
    cur.execute("""CREATE TABLE IF NOT EXISTS reports (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp       TEXT,
        action          TEXT,
        location        TEXT,
        location_full   TEXT,
        device          TEXT,
        file_size_mb    REAL,
        risk_score      REAL,
        risk_level      TEXT,
        label           TEXT,
        recommendation  TEXT,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")

    conn.commit()

    # Import CSV into SQLite
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw_logs", "cloud_logs.csv")
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        df.to_sql("forensic_logs", conn, if_exists="replace", index=False)
        print(f"Imported {len(df)} records into forensic_logs table")
    else:
        print("[WARN] cloud_logs.csv not found — run generate_logs.py first")

    conn.close()
    print(f"SQLite database ready at: {DB_PATH}")

if __name__ == "__main__":
    init_db()
