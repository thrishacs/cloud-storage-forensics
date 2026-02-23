from flask import Blueprint, jsonify, request
import joblib, numpy as np

predict_bp = Blueprint("predict", __name__)
rf = joblib.load("backend/ml/rf_model.pkl")
encoders = joblib.load("backend/ml/encoders.pkl")

def encode_input(action, location, device, file_size):
    try:
        a = encoders["action"].transform([action])[0]
        l = encoders["location"].transform([location])[0]
        d = encoders["device"].transform([device])[0]
        return np.array([[a, l, d, float(file_size)]])
    except:
        return None

@predict_bp.route("/api/predict", methods=["POST"])
def predict():
    data = request.json
    X = encode_input(data.get("action"), data.get("location"),
                     data.get("device"), data.get("file_size_mb", 0))
    if X is None:
        return jsonify({"error": "Invalid input"}), 400
    prob = rf.predict_proba(X)[0][1]
    label = "anomaly" if prob > 0.5 else "normal"
    return jsonify({"risk_score": round(float(prob), 4), "label": label})
