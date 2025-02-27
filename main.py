##############################################
# main.py - Single-Service Approach (Updated)
# --------------------------------------------
# ✅ Uses return flight logic (adjusted price)
# ✅ Uses precomputed JSON if available
# ✅ JSON output includes only booking months leading up to departure month
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
import uvicorn  # Ensure Uvicorn is imported

########################################################
# GLOBAL VARIABLES
########################################################
precomputed_dict: Dict[Tuple[str, int, int], float] = {}
df_global = None
airline_type_map = {}
app = FastAPI()

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
    ctype = airline_type_map.get(carrier_name, "unknown").lower()
    return 1.5 if ctype == "premium" else 1.0

########################################################
# Lifespan: Runs at Startup and Shutdown
########################################################
@asynccontextmanager
async def lifespan(app: FastAPI):
    global precomputed_dict, df_global, airline_type_map

    client = storage.Client()

    # A) Load precomputed JSON
    json_file_path = "/content/precomputed_jan_dec.json"
    if not os.path.exists(json_file_path):
        print(f"[Startup] No precomputed JSON found at {json_file_path}.")
        precomputed_dict = {}
    else:
        with open(json_file_path, "r") as f:
            pre_list = json.load(f)
        precomputed_dict = {
            (x["destination_iata"], x["departure_month"], x["booking_month"]): x["adjusted_avg_price"]
            for x in pre_list
        }
        print(f"[Startup] Loaded {len(precomputed_dict)} precomputed prices.")

    # B) Load fallback dataset
    csv_fallback_path = "/content/local_bq_results.csv"
    if not os.path.exists(csv_fallback_path):
        print(f"[Startup] No fallback CSV found at {csv_fallback_path}.")
        df_global = pd.DataFrame()
    else:
        df_local = pd.read_csv(csv_fallback_path)
        df_local["created"] = pd.to_datetime(df_local["created"], errors="coerce")
        df_local["PD_Departure_Date"] = pd.to_datetime(df_local["PD_Departure_Date"], errors="coerce")
        df_local["PD_Return_Date"] = pd.to_datetime(df_local["PD_Return_Date"], errors="coerce")
        df_global = df_local
        print(f"[Startup] Fallback CSV loaded with {len(df_global)} rows.")

    # C) Load airline types from CSV
    airline_type_csv = "/content/airline_type.csv"
    if os.path.exists(airline_type_csv):
        df_at = pd.read_csv(airline_type_csv)
        airline_type_map = dict(zip(df_at["Airline"], df_at["Type"]))
        print(f"[Startup] Loaded {len(airline_type_map)} airlines.")

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
            final_price = pre_price * num_travelers
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": final_price,
                "source": "precomputed"
            })
            continue

        # Fallback logic
        df_filtered = df_global[
            (df_global["PD_Origin"].isin(australian_airports)) &
            (df_global["PD_Destination"] == destination_iata) &
            (df_global["PD_Departure_Date"].dt.month == departure_month) &
            (df_global["created"].dt.month == booking_m)
        ].copy()

        if df_filtered.empty:
            results.append({"booking_month": booking_m, "adjusted_avg_price": None, "source": "fallback_no_data"})
            continue

        # Adjust price for return flights
        df_filtered["Adjusted_Price_Per_Passenger"] = df_filtered.apply(
            lambda row: row["Price Per Passenger (AUD)"] / 2 if pd.notnull(row["PD_Return_Date"])
            else row["Price Per Passenger (AUD)"], axis=1
        )

        # Apply airline weights
        df_filtered["Airline_Weight"] = df_filtered["PD_Carrier"].apply(airline_weight)

        # Apply airline filter if requested
        if airline_filter:
            filter_lower = airline_filter.lower()
            df_filtered["Carrier_Type"] = df_filtered["PD_Carrier"].apply(
                lambda c: airline_type_map.get(c, "unknown").lower()
            )
            df_filtered = df_filtered[df_filtered["Carrier_Type"] == filter_lower]
            if df_filtered.empty:
                results.append({"booking_month": booking_m, "adjusted_avg_price": None, "source": f"fallback_{airline_filter}_no_rows"})
                continue

        # Weighted average calculation
        weighted_sum = (df_filtered["Adjusted_Price_Per_Passenger"] * df_filtered["PD_Passengers"] * df_filtered["Airline_Weight"]).sum()
        weight_factor = (df_filtered["PD_Passengers"] * df_filtered["Airline_Weight"]).sum()

        final_price = (weighted_sum / weight_factor) * num_travelers if weight_factor else None
        results.append({"booking_month": booking_m, "adjusted_avg_price": final_price, "source": "real_time"})

    return {"destination_iata": destination_iata, "departure_month": departure_month, "airline_filter": airline_filter, "analysis": results}

########################################################
# Run Uvicorn (Required for Cloud Run)
########################################################
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080)
