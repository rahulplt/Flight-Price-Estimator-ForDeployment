from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import pandas as pd
import datetime
import logging
import os

# Import GCS libraries
from google.cloud import storage
from io import StringIO

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

########################################################
# Global Variables
########################################################
precomputed_dict = {}
df_global = None
airline_type_map = {}

# Aussie airports for fallback filters
australian_airports = [
    "SYD", "MEL", "BNE", "PER", "ADL", "CBR", "HBA", "DRW", "OOL", "CNS", "AVV", "MCY",
    "NTL", "TSV", "PPP", "MQL", "ABX", "TMW", "ARM", "GLT", "LST", "PHE", "KTA", "KGI",
    "KNS", "HVB", "BME", "AYQ", "MOV", "PLO", "GOV", "MNG", "BHS", "ISA", "GET", "WEI",
    "RMA", "GFF", "BHQ"
]

########################################################
# Utility Functions to Download from GCS
########################################################

def download_json_from_gcs(bucket_name: str, blob_name: str):
    """
    Downloads a JSON file from a GCS bucket and returns it as a Python object.
    """
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        data_str = blob.download_as_text()
        return json.loads(data_str)
    except Exception as e:
        logger.error(f"Failed to download JSON {blob_name} from {bucket_name}: {e}")
        return []

def download_csv_from_gcs(bucket_name: str, blob_name: str) -> pd.DataFrame:
    """
    Downloads a CSV file from a GCS bucket and returns it as a pandas DataFrame.
    Returns an empty DataFrame if the download fails.
    """
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        csv_str = blob.download_as_text()
        return pd.read_csv(StringIO(csv_str))
    except Exception as e:
        logger.error(f"Failed to download CSV {blob_name} from {bucket_name}: {e}")
        return pd.DataFrame()

########################################################
# Lifespan Manager: Load Data from GCS on Startup
########################################################

@asynccontextmanager
async def lifespan(app: FastAPI):
    global precomputed_dict, df_global, airline_type_map

    bucket_name = "plt-flight-price-estimator-storage"

    # 1) Load precomputed JSON from GCS
    precomputed_list = download_json_from_gcs(bucket_name, "precomputed_jan_dec.json")
    for item in precomputed_list:
        key = (item["destination_iata"], item["departure_month"])
        precomputed_dict[key] = item["adjusted_avg_price"]
    logger.info("Precomputed JSON loaded successfully")

    # 2) Load fallback dataset from GCS (updated file name)
    df_local = download_csv_from_gcs(bucket_name, "bq-results-20250221-050429-1740114384017.csv")
    if not df_local.empty:
        df_local['created'] = pd.to_datetime(df_local['created'], errors='coerce')
        df_local['PD_Departure_Date'] = pd.to_datetime(df_local['PD_Departure_Date'], errors='coerce')
        df_global = df_local
        logger.info("Fallback CSV loaded successfully")
    else:
        df_global = pd.DataFrame()
        logger.warning("Fallback CSV not loaded; proceeding with empty DataFrame")

    # 3) Load airline types from GCS
    df_airline_type_local = download_csv_from_gcs(bucket_name, "airline_type.csv")
    if not df_airline_type_local.empty:
        airline_type_map.update(dict(zip(df_airline_type_local["Airline"], df_airline_type_local["Type"])))
        logger.info("Airline type CSV loaded successfully")
    else:
        logger.warning("Airline type CSV not loaded; proceeding with empty map")

    yield
    logger.info("Shutdown: cleaning up if needed...")

########################################################
# Create FastAPI App with the lifespan manager
########################################################
app = FastAPI(lifespan=lifespan)

# Enable CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

########################################################
# The Endpoint: /average_price/
########################################################
@app.get("/average_price/")
def average_price(
    destination_iata: str,
    departure_month: int,
    num_travelers: int = 1,
    airline_filter: str = None
):
    """
    Returns a multi-month breakdown from January (1) up to (departure_month - 1).
    If 'airline_filter' is 'premium' or 'budget', we only keep carriers of that type.
    """
    results = []

    for booking_m in range(1, departure_month):
        # A) Check Precomputed Data
        precomputed_key = (destination_iata, booking_m)
        precomputed_price = precomputed_dict.get(precomputed_key)
        if precomputed_price is not None:
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": precomputed_price * num_travelers,
                "source": "precomputed"
            })
            continue

        # B) Fallback if Not in Precompute
        if df_global.empty:
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": None,
                "source": "fallback_unavailable"
            })
            continue

        df_filtered = df_global[
            (df_global['PD_Origin'].isin(australian_airports)) &
            (df_global['PD_Destination'] == destination_iata) &
            (df_global['PD_Departure_Date'].dt.month == departure_month)
        ].copy()

        df_filtered['Booking_Month_Only'] = df_filtered['created'].dt.month
        df_filtered = df_filtered[df_filtered['Booking_Month_Only'] == booking_m]

        if df_filtered.empty:
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": None,
                "source": "fallback_no_data"
            })
            continue

        # Clean price
        df_filtered['Price Per Passenger (AUD)'] = (
            df_filtered['Price Per Passenger (AUD)']
            .astype(str)
            .str.replace('[^0-9.]', '', regex=True)
            .astype(float)
        )

        # Recency weight
        df_filtered['Recency_Weight'] = (
            df_filtered['created'].dt.year - df_filtered['created'].dt.year.min() + 1
        )

        # Airline weight from airline_type_map
        def airline_weight(carrier_name: str):
            ctype = airline_type_map.get(carrier_name, "Unknown").lower()
            if ctype == "premium":
                return 1.5
            elif ctype == "budget":
                return 1.0
            else:
                return 1.0

        df_filtered['Airline_Weight'] = df_filtered['PD_Carrier'].apply(airline_weight)

        # Apply airline filter if provided
        if airline_filter is not None:
            filter_lower = airline_filter.lower()
            df_filtered['Carrier_Type'] = df_filtered['PD_Carrier'].apply(
                lambda c: airline_type_map.get(c, "Unknown").lower()
            )
            df_filtered = df_filtered[df_filtered['Carrier_Type'] == filter_lower]
            if df_filtered.empty:
                results.append({
                    "booking_month": booking_m,
                    "adjusted_avg_price": None,
                    "source": f"fallback_{airline_filter}_no_data"
                })
                continue

        # Outlier removal
        df_filtered['Monthly_Median'] = df_filtered.groupby('Booking_Month_Only')['Price Per Passenger (AUD)'].transform('median')
        df_filtered['Monthly_Deviation'] = abs(df_filtered['Price Per Passenger (AUD)'] - df_filtered['Monthly_Median'])
        df_filtered['Outlier_Threshold'] = df_filtered['Monthly_Median'] * 0.40
        df_filtered = df_filtered[df_filtered['Monthly_Deviation'] <= df_filtered['Outlier_Threshold']]

        if df_filtered.empty:
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": None,
                "source": "fallback_no_data_after_outliers"
            })
            continue

        weighted_sum = (
            df_filtered['Price Per Passenger (AUD)']
            * df_filtered['PD_Passengers']
            * df_filtered['Recency_Weight']
            * df_filtered['Airline_Weight']
        ).sum()

        weight_factor = (
            df_filtered['PD_Passengers']
            * df_filtered['Recency_Weight']
            * df_filtered['Airline_Weight']
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
        "airline_filter": airline_filter,
        "analysis": results
    }

# Ensure the app runs on the correct port for Cloud Run
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
