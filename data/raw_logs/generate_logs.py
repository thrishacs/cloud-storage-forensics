import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta

fake = Faker()
random.seed(42)
np.random.seed(42)

ACTIONS = ["upload","download","share","login","bulk_download","permission_change"]
LOCATIONS = ["IN","US","BR","CN","FR","RU"]
DEVICES = ["Chrome/Windows","Firefox/Linux","Safari/Mac","Edge/Windows"]

logs = []
base_time = datetime(2026, 1, 1)
for i in range(2000):
    is_attack = random.random() < 0.25
    action = random.choice(["bulk_download","login"]) if is_attack else random.choice(ACTIONS)
    loc = random.choice(["BR","RU","CN"]) if is_attack else random.choice(LOCATIONS)
    logs.append({
        "timestamp": (base_time + timedelta(minutes=i*5)).isoformat(),
        "user_id": f"user_{random.randint(1,20)}",
        "action": action,
        "file_id": f"file_{random.randint(1,100)}",
        "ip_address": fake.ipv4(),
        "location": loc,
        "device": random.choice(DEVICES),
        "file_size_mb": round(random.uniform(0.1, 500), 2),
        "is_anomaly": int(is_attack)
    })

df = pd.DataFrame(logs)
df.to_csv("data/raw_logs/cloud_logs.csv", index=False)
print(f"Generated {len(df)} logs -> data/raw_logs/cloud_logs.csv")
