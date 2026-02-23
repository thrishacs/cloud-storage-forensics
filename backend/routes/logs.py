from flask import Blueprint, jsonify, request
import pandas as pd

logs_bp = Blueprint("logs", __name__)
df = pd.read_csv("data/raw_logs/cloud_logs.csv")

@logs_bp.route("/api/logs")
def get_logs():
    page = int(request.args.get("page", 1))
    per_page = 50
    start = (page - 1) * per_page
    data = df.iloc[start:start+per_page].to_dict(orient="records")
    return jsonify({"logs": data, "total": len(df)})
