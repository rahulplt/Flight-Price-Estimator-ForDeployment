##############################################
# main.py - Single-Service Approach
# --------------------------------------------
# This code:
#   - Loads a precomputed_jan_dec.json at startup
#   - Has /average_price?destination_iata=..., etc. 
#       => tries precompute, else fallback
#   - Has /generate_precompute (POST) 
#       => re-generates precomputed_jan_dec.json from GCS CSV
#       => saves new JSON to GCS
#       => updates in-memory dict
# Use Cloud Scheduler to POST /generate_precompute weekly.
##############################################

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import pandas as pd
import datetime
import os
from typing import Dict, Tuple

# GCS library for reading/writing CSV/JSON from/to Cloud Storage
from google.cloud import storage
from io import StringIO

########################################################
# GLOBALS
########################################################
precomputed_dict: Dict[Tuple[str, int, int], float] = {}
df_global = None
airline_type_map = {}
app = FastAPI()

# A set of Aussie airports used in fallback filtering
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
    ctype = airline_type_map.get(carrier_name, "unknown").lower()
    if ctype == "premium":
        return 1.5
    elif ctype == "budget":
        return 1.0
    else:
        return 1.0

########################################################
# Lifespan: Runs at Startup and Shutdown
########################################################
@asynccontextmanager
async def lifespan(app: FastAPI):
    global precomputed_dict, df_global, airline_type_map

    # A) Initialize GCS client
    client = storage.Client()

    # B) PRECOMPUTED JSON from GCS or local
    #    In this example, let's assume we keep it local /content for the demo
    #    In real usage, you'd do a GCS download, e.g.:
    #
    # bucket = client.bucket("plt-flight-price-estimator-storage")
    # blob = bucket.blob("precomputed_jan_dec.json")
    # precompute_str = blob.download_as_text()
    #
    # But for the Colab demo, let's just read local
    json_file_path = "/content/precomputed_jan_dec.json"
    if not os.path.exists(json_file_path):
        print(f"[Startup] No local precomputed JSON found at {json_file_path}; continuing with empty dict.")
        precomputed_dict = {}
    else:
        with open(json_file_path, "r") as f:
            pre_list = json.load(f)
        # Build triple-key dict => (destination_iata, dep_month, booking_month)
        precomputed_dict = {
            (x["destination_iata"], x["departure_month"], x["booking_month"]): x["adjusted_avg_price"]
            for x in pre_list
        }
        print(f"[Startup] Loaded {len(precomputed_dict)} items from precomputed JSON.")

    # C) Fallback main dataset
    #    For the demo, read local. In real usage, you might also read from GCS, e.g.:
    #    raw_blob = bucket.blob("bq-results-20250221-050429-xxx.csv")
    #    csv_str = raw_blob.download_as_text()
    #    df_temp = pd.read_csv(StringIO(csv_str))
    csv_fallback_path = "/content/local_bq_results.csv"
    if not os.path.exists(csv_fallback_path):
        print(f"[Startup] No local fallback CSV found at {csv_fallback_path}. Fallback will be empty.")
        df_global = pd.DataFrame()
    else:
        df_local = pd.read_csv(csv_fallback_path)
        df_local["created"] = pd.to_datetime(df_local["created"], errors="coerce")
        df_local["PD_Departure_Date"] = pd.to_datetime(df_local["PD_Departure_Date"], errors="coerce")
        df_global = df_local
        print(f"[Startup] Fallback CSV loaded with {len(df_global)} rows.")

    # D) airline_type.csv => build map
    airline_type_csv = "/content/airline_type.csv"
    if not os.path.exists(airline_type_csv):
        print(f"[Startup] airline_type.csv not found at {airline_type_csv}. Defaulting all carriers => 'unknown'.")
    else:
        df_at = pd.read_csv(airline_type_csv)
        airline_type_map = dict(zip(df_at["Airline"], df_at["Type"]))
        print(f"[Startup] Loaded airline_type_map with {len(airline_type_map)} carriers.")

    print("[Startup] Completed initialization.")
    yield
    print("[Shutdown] Cleanup if needed.")


app = FastAPI(lifespan=lifespan)

# Allow cross-origin
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
def average_price(
    destination_iata: str,
    departure_month: int,
    num_travelers: int = 1,
    airline_filter: str = None
):

    results = []
    for booking_m in range(1, 13):
        key = (destination_iata, departure_month, booking_m)
        pre_price = precomputed_dict.get(key)
        if pre_price is not None:
            # If you want to multiply the precomputed price by num_travelers, do so:
            final_price = pre_price * num_travelers
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": final_price,
                "source": "precomputed"
            })
            continue
        else:
            # Fallback
            if df_global is None or df_global.empty:
                results.append({
                    "booking_month": booking_m,
                    "adjusted_avg_price": None,
                    "source": "fallback_empty_df"
                })
                continue

            df_filtered = df_global[
                (df_global["PD_Origin"].isin(australian_airports)) &
                (df_global["PD_Destination"] == destination_iata) &
                (df_global["PD_Departure_Date"].dt.month == departure_month) &
                (df_global["created"].dt.month == booking_m)
            ].copy()

            if len(df_filtered) == 0:
                results.append({
                    "booking_month": booking_m,
                    "adjusted_avg_price": None,
                    "source": "fallback_no_data"
                })
                continue

            # Clean price
            df_filtered["Price Per Passenger (AUD)"] = (
                df_filtered["Price Per Passenger (AUD)"]
                .astype(str)
                .str.replace('[^0-9.]','', regex=True)
                .astype(float)
            )

            # Possibly handle airline_filter
            if airline_filter is not None:
                filter_lower = airline_filter.lower()
                df_filtered["carrier_type"] = df_filtered["PD_Carrier"].apply(
                    lambda c: airline_type_map.get(c, "unknown").lower()
                )
                df_filtered = df_filtered[df_filtered["carrier_type"] == filter_lower]
                if len(df_filtered) == 0:
                    results.append({
                        "booking_month": booking_m,
                        "adjusted_avg_price": None,
                        "source": f"fallback_{airline_filter}_no_rows"
                    })
                    continue

            # Weighted average
            df_filtered["Airline_Weight"] = df_filtered["PD_Carrier"].apply(airline_weight)
            weighted_sum = (
                df_filtered["Price Per Passenger (AUD)"]
                * df_filtered["PD_Passengers"]
                * df_filtered["Airline_Weight"]
            ).sum()
            weight_factor = (
                df_filtered["PD_Passengers"]
                * df_filtered["Airline_Weight"]
            ).sum()

            if weight_factor == 0:
                results.append({
                    "booking_month": booking_m,
                    "adjusted_avg_price": None,
                    "source": "fallback_zero_weight"
                })
                continue

            fallback_price = (weighted_sum / weight_factor) * num_travelers
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": fallback_price,
                "source": "real_time"
            })

    return {
        "destination_iata": destination_iata,
        "departure_month": departure_month,
        "num_travelers": num_travelers,
        "airline_filter": airline_filter,
        "analysis": results
    }


########################################################
# /generate_precompute (POST)
########################################################
@app.post("/generate_precompute")
def generate_precompute():

    # Configure GCS references
    client = storage.Client()
    bucket_name = "plt-flight-price-estimator-storage"
    input_blob_name = "bq-results-20250221-050429-1740114384017.csv"
    output_blob_name = "precomputed_jan_dec.json"

    # Step A) Download the main CSV from GCS
    bucket = client.bucket(bucket_name)
    input_blob = bucket.blob(input_blob_name)

    csv_str = input_blob.download_as_text()
    df = pd.read_csv(StringIO(csv_str))

    df["created"] = pd.to_datetime(df["created"], errors="coerce")
    df["PD_Departure_Date"] = pd.to_datetime(df["PD_Departure_Date"], errors="coerce")

    # Insert your logic to build (dest, dep_month, booking_month) => price
    # For simplicity, let's do a minimal approach:

    new_dict = {}

    # Suppose we have a list of destinations or just gather from data, or do exactly your logic
    # We'll do a small version here:
    # e.g. for each unique PD_Destination & each month departure => each booking month => compute weighted avg
    # In your real code, you'd do the loop from your snippet.

    # Aussie filter
    df = df[df["PD_Origin"].isin(australian_airports)].copy()

    # Or load airline_type again, up to you:
    # airline_type_blob = bucket.blob("airline_type.csv")
    # at_csv = airline_type_blob.download_as_text()
    # df_at = pd.read_csv(StringIO(at_csv))
    # airline_type_map = dict(zip(df_at["Airline"], df_at["Type"]))

    # We'll do the loop just as you do above:
    destinations = df["PD_Destination"].unique()
    for dest_iata in destinations:
        for dep_month in range(1, 13):
            df_dep = df[
                (df["PD_Destination"] == dest_iata) &
                (df["PD_Departure_Date"].dt.month == dep_month)
            ].copy()
            if df_dep.empty:
                # store None for all booking months
                for bm in range(1, 13):
                    new_dict[(dest_iata, dep_month, bm)] = None
                continue
            
            df_dep["Booking_Month_Only"] = df_dep["created"].dt.month
            for bm in range(1, 13):
                df_bm = df_dep[df_dep["Booking_Month_Only"] == bm].copy()
                if df_bm.empty:
                    new_dict[(dest_iata, dep_month, bm)] = None
                    continue
                # Weighted average
                df_bm["Airline_Weight"] = df_bm["PD_Carrier"].apply(airline_weight)
                weighted_sum = (
                    df_bm["Price Per Passenger (AUD)"]
                    * df_bm["PD_Passengers"]
                    * df_bm["Airline_Weight"]
                ).sum()
                weight_factor = (
                    df_bm["PD_Passengers"]
                    * df_bm["Airline_Weight"]
                ).sum()
                if weight_factor == 0:
                    new_dict[(dest_iata, dep_month, bm)] = None
                else:
                    new_dict[(dest_iata, dep_month, bm)] = weighted_sum / weight_factor

    # Step B) Convert new_dict => list of {dest, dep_m, bm, price}
    precompute_list = []
    for (dest, dep_m, bm), price in new_dict.items():
        precompute_list.append({
            "destination_iata": dest,
            "departure_month": dep_m,
            "booking_month": bm,
            "adjusted_avg_price": price
        })

    # Step C) Upload to GCS
    output_blob = bucket.blob(output_blob_name)
    output_json_str = json.dumps(precompute_list, indent=2)
    output_blob.upload_from_string(output_json_str, content_type="application/json")

    # Step D) Update in-memory precomputed_dict so future queries see fresh data
    global precomputed_dict
    precomputed_dict = { (x["destination_iata"], x["departure_month"], x["booking_month"]): x["adjusted_avg_price"]
                         for x in precompute_list }

    return {
        "message": "Successfully rebuilt precomputed_jan_dec.json and updated in-memory dictionary.",
        "count": len(precompute_list)
    }
