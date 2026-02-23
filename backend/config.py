import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    DEBUG = os.getenv("DEBUG", "True")
    PORT = int(os.getenv("PORT", 5000))
    DATA_PATH = os.getenv("DATA_PATH", "data/raw_logs/cloud_logs.csv")
    MODEL_PATH = os.getenv("MODEL_PATH", "ml/rf_model.pkl")
    ENCODER_PATH = os.getenv("ENCODER_PATH", "ml/encoders.pkl")
