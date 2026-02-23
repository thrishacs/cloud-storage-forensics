import pandas as pd, numpy as np, joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report

df = pd.read_csv("data/raw_logs/cloud_logs.csv")

le_action = LabelEncoder(); le_loc = LabelEncoder(); le_dev = LabelEncoder()
df["action_enc"] = le_action.fit_transform(df["action"])
df["location_enc"] = le_loc.fit_transform(df["location"])
df["device_enc"] = le_dev.fit_transform(df["device"])

FEATURES = ["action_enc", "location_enc", "device_enc", "file_size_mb"]
X = df[FEATURES]; y = df["is_anomaly"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)
print("=== Random Forest ===")
print(classification_report(y_test, rf.predict(X_test)))

lr = LogisticRegression(max_iter=200)
lr.fit(X_train, y_train)
print("=== Logistic Regression ===")
print(classification_report(y_test, lr.predict(X_test)))

joblib.dump(rf, "backend/ml/rf_model.pkl")
joblib.dump(lr, "backend/ml/lr_model.pkl")
joblib.dump({"action": le_action, "location": le_loc, "device": le_dev}, "backend/ml/encoders.pkl")
print("Models saved to backend/ml/")
