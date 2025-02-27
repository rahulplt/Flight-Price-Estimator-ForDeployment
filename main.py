##############################################
# main.py - Single-Service Approach (Updated)
# --------------------------------------------
# ✅ Uses return flight logic (adjusted price)
# ✅ Uses precomputed JSON if available
# ✅ If no precomputed data → fetch latest dataset from GCS
##############################################

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import pandas as pd
import datetime
import os
from typing import Dict, Tuple
from google.cloud import storage
from io import StringIO
import uvicorn  # Required for Cloud Run

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

# Aussie airports for filtering
australian_airports = [
    'SYD','MEL','BNE','PER','ADL','CBR','HBA','DRW','OOL','CNS','AVV','MCY',
    'NTL','TSV','PPP','MQL','ABX','TMW','ARM','GLT','LST','PHE','KTA','KGI',
    'KNS','HVB','BME','AYQ','MOV','PLO','GOV','MNG','BHS','ISA','GET','WEI',
    'RMA','GFF','BHQ'
]

########################################################
# airline_weight helper
########################################################
def airline_weight(carrier_name: str) -> float:
    """ Assigns weight based on airline type """
    ctype = airline_type_map.get(carrier_name, "unknown").lower()
    return 1.5 if ctype == "premium" else 1.0

########################################################
# Utility Function: Load CSV from GCS
########################################################
def load_csv_from_gcs(blob_name: str) -> pd.DataFrame:
    """ Fetches a CSV file from GCS and loads it into a Pandas DataFrame """
    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET_NAME)
    blob = bucket.blob(blob_name)

    csv_str = blob.download_as_text()
    df = pd.read_csv(StringIO(csv_str))

    # Normalize column names to avoid case mismatches
    df.columns = df.columns.str.strip().str.lower()
    return df

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
        airline_type_map = dict(zip(df_at["airline"], df_at["type"]))
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
# /average_price (GET)
########################################################
@app.get("/average_price/")
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
        expected_cols = ["pd_origin", "pd_destination", "pd_departure_date", "pd_return_date", "created", "pd_passengers", "pd_carrier", "price per passenger (aud)"]
        if not all(col in df_global.columns for col in expected_cols):
            results.append({"booking_month": booking_m, "adjusted_avg_price": None, "source": "fallback_missing_columns"})
            continue

        # Convert necessary columns to datetime
        df_global["created"] = pd.to_datetime(df_global["created"], errors="coerce")
        df_global["pd_departure_date"] = pd.to_datetime(df_global["pd_departure_date"], errors="coerce")
        df_global["pd_return_date"] = pd.to_datetime(df_global["pd_return_date"], errors="coerce")

        # Apply filtering
        df_filtered = df_global[
            (df_global["pd_origin"].isin(australian_airports)) &
            (df_global["pd_destination"] == destination_iata) &
            (df_global["pd_departure_date"].dt.month == departure_month) &
            (df_global["created"].dt.month == booking_m)
        ].copy()

        if df_filtered.empty:
            results.append({"booking_month": booking_m, "adjusted_avg_price": None, "source": "fallback_no_data"})
            continue

        # Adjust price for return flights
        df_filtered["adjusted_price_per_passenger"] = df_filtered.apply(
            lambda row: row["price per passenger (aud)"] / 2 if pd.notnull(row["pd_return_date"])
            else row["price per passenger (aud)"], axis=1
        )

        # Apply airline weights
        df_filtered["airline_weight"] = df_filtered["pd_carrier"].apply(airline_weight)

        # Weighted average calculation
        weighted_sum = (df_filtered["adjusted_price_per_passenger"] * df_filtered["pd_passengers"] * df_filtered["airline_weight"]).sum()
        weight_factor = (df_filtered["pd_passengers"] * df_filtered["airline_weight"]).sum()

        final_price = (weighted_sum / weight_factor) * num_travelers if weight_factor else None
        results.append({"booking_month": booking_m, "adjusted_avg_price": final_price, "source": "real_time"})

    return {"destination_iata": destination_iata, "departure_month": departure_month, "airline_filter": airline_filter, "analysis": results}

########################################################
# Run Uvicorn (Required for Cloud Run)
########################################################
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080)
