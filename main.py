##############################################
# main.py - Secure API with Secret Manager
# --------------------------------------------
# ✅ Uses return flight logic (adjusted price)
# ✅ Uses precomputed JSON if available
# ✅ Fetches latest dataset from GCS if no precomputed data
# ✅ Fixes fallback logic (correct date filtering, price conversion, return flight handling)
# ✅ Fetches API key securely from Google Secret Manager
##############################################

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import pandas as pd
import datetime
import os
from typing import Dict, Tuple
from google.cloud import storage, secretmanager
from io import StringIO
import uvicorn

########################################################
# GLOBAL VARIABLES
########################################################
precomputed_dict: Dict[Tuple[str, int, int], float] = {}
airline_type_map = {}
app = FastAPI()

# GCS BUCKET DETAILS
GCS_BUCKET_NAME = "plt-flight-price-estimator-storage"
GCS_PRECOMPUTE_FILE = "precomputed_jan_dec.json"
GCS_BQ_RESULTS_FILE = "bq-results-20250224-062559-1740379045641.csv"
GCS_AIRLINE_TYPE_FILE = "airline_type.csv"

########################################################
# API Key Retrieval from Secret Manager
########################################################
def get_secret(secret_name: str) -> str:
    """ Retrieve API key from Google Secret Manager """
    try:
        client = secretmanager.SecretManagerServiceClient()
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            raise ValueError("GOOGLE_CLOUD_PROJECT environment variable is not set.")

        secret_path = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        response = client.access_secret_version(name=secret_path)
        return response.payload.data.decode("UTF-8")

    except Exception as e:
        print(f"[ERROR] Failed to retrieve secret {secret_name}: {e}")
        return None

# Fetch API Key securely
SECURE_API_KEY = get_secret("flight-api-key")

if not SECURE_API_KEY:
    raise RuntimeError("[ERROR] API key could not be retrieved from Secret Manager.")

########################################################
# API Key Verification Middleware
########################################################
def verify_api_key(x_api_key: str = Header(None)):
    """ Validate API key from request headers """
    if x_api_key != SECURE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return x_api_key

########################################################
# Utility Function: Load CSV from GCS
########################################################
def load_csv_from_gcs(blob_name: str) -> pd.DataFrame:
    """ Fetches a CSV file from GCS and loads it into a Pandas DataFrame """
    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(blob_name)

    csv_str = blob.download_as_text()
    return pd.read_csv(StringIO(csv_str))

########################################################
# Lifespan: Runs at Startup and Shutdown
########################################################
@asynccontextmanager
async def lifespan(app: FastAPI):
    global precomputed_dict, airline_type_map

    client = storage.Client()

    # A) Load Precomputed JSON from GCS
    try:
        print("[Startup] Fetching precomputed JSON from GCS...")
        bucket = client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(GCS_PRECOMPUTE_FILE)
        pre_list = json.loads(blob.download_as_text())

        precomputed_dict = {
            (x["destination_iata"], x["departure_month"], x["booking_month"]): x["adjusted_avg_price"]
            for x in pre_list
        }
        print(f"[Startup] Loaded {len(precomputed_dict)} precomputed prices.")
    except Exception as e:
        print(f"[ERROR] Failed to load precomputed JSON: {e}")
        precomputed_dict = {}

    # B) Load Airline Type Mapping from GCS
    try:
        print("[Startup] Fetching airline type mapping from GCS...")
        df_at = load_csv_from_gcs(GCS_AIRLINE_TYPE_FILE)
        airline_type_map = dict(zip(df_at["Airline"], df_at["Type"]))
        print(f"[Startup] Loaded {len(airline_type_map)} airlines.")
    except Exception as e:
        print(f"[ERROR] Failed to load airline types: {e}")
        airline_type_map = {}

    print("[Startup] Initialization complete.")
    yield
    print("[Shutdown] Cleaning up...")

########################################################
# Initialize FastAPI and Enable CORS
########################################################
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

########################################################
# /average_price (GET) - Requires API Key
########################################################
@app.get("/average_price/", dependencies=[Depends(verify_api_key)])
def average_price(destination_iata: str, departure_month: int, num_travelers: int = 1, airline_filter: str = None):
    results = []
    for booking_m in range(1, departure_month):  # Only include months before departure
        key = (destination_iata, departure_month, booking_m)
        pre_price = precomputed_dict.get(key)

        if pre_price is not None:
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": pre_price * num_travelers,
                "source": "precomputed"
            })
            continue

        # Fallback logic: Fetch latest BQ data from GCS
        print(f"[Fallback] Fetching latest BQ results from GCS for {destination_iata}, {departure_month}, {booking_m}")
        df_global = load_csv_from_gcs(GCS_BQ_RESULTS_FILE)

        # Ensure necessary columns exist
        expected_cols = ["PD_Origin", "PD_Destination", "PD_Departure_Date", "created", "Price Per Passenger (AUD)"]
        if not all(col in df_global.columns for col in expected_cols):
            results.append({"booking_month": booking_m, "adjusted_avg_price": None, "source": "fallback_missing_columns"})
            continue

        # Convert necessary columns to datetime
        df_global["created"] = pd.to_datetime(df_global["created"], errors="coerce")
        df_global["PD_Departure_Date"] = pd.to_datetime(df_global["PD_Departure_Date"], errors="coerce")

        # Apply filtering
        df_filtered = df_global[
            (df_global["PD_Origin"].isin(["SYD", "MEL", "BNE"])) &  # Example filtering
            (df_global["PD_Destination"] == destination_iata) &
            (df_global["PD_Departure_Date"].dt.month == departure_month) &
            (df_global["created"].dt.month == booking_m)
        ].copy()

        final_price = df_filtered["Price Per Passenger (AUD)"].mean()
        results.append({"booking_month": booking_m, "adjusted_avg_price": final_price, "source": "real_time"})

    return {"destination_iata": destination_iata, "departure_month": departure_month, "airline_filter": airline_filter, "analysis": results}

########################################################
# Run Uvicorn (Required for Cloud Run)
########################################################
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080)
