from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
import pandas as pd
import datetime

# Import GCS libraries
from google.cloud import storage
from io import StringIO

########################################################
# Global Variables
########################################################
precomputed_dict = {}
df_global = None
airline_type_map = {}  # e.g. { "QANTAS AIRWAYS": "Premium", "JETSTAR": "Budget", ... }

# Aussie airports for fallback filters
australian_airports = [
    "SYD","MEL","BNE","PER","ADL","CBR","HBA","DRW","OOL","CNS","AVV","MCY",
    "NTL","TSV","PPP","MQL","ABX","TMW","ARM","GLT","LST","PHE","KTA","KGI",
    "KNS","HVB","BME","AYQ","MOV","PLO","GOV","MNG","BHS","ISA","GET","WEI",
    "RMA","GFF","BHQ"
]

########################################################
# Utility Functions to Download from GCS
########################################################

def download_json_from_gcs(bucket_name: str, blob_name: str):
    """
    Downloads a JSON file from a GCS bucket and returns it as a Python object.
    """
    client = storage.Client()  # Uses default credentials from Cloud Run service account
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    data_str = blob.download_as_text()  # Download file as text
    return json.loads(data_str)

def download_csv_from_gcs(bucket_name: str, blob_name: str) -> pd.DataFrame:
    """
    Downloads a CSV file from a GCS bucket and returns it as a pandas DataFrame.
    """
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    csv_str = blob.download_as_text()  # Download file as a string
    return pd.read_csv(StringIO(csv_str))

########################################################
# Lifespan Manager: Load Data from GCS on Startup
########################################################

@asynccontextmanager
async def lifespan(app: FastAPI):
    global precomputed_dict, df_global, airline_type_map

    # Bucket name
    bucket_name = "plt-flight-price-estimator-storage"

    # 1) Load precomputed JSON from GCS
    precomputed_list = download_json_from_gcs(
        bucket_name,
        "precomputed_jan_dec.json"
    )
    for item in precomputed_list:
        key = (item["destination_iata"], item["departure_month"])
        precomputed_dict[key] = item["adjusted_avg_price"]

    # 2) Load fallback dataset (local_bq_results.csv) from GCS
    df_local = download_csv_from_gcs(
        bucket_name,
        "local_bq_results.csv"
    )
    df_local['created'] = pd.to_datetime(df_local['created'], errors='coerce')
    df_local['PD_Departure_Date'] = pd.to_datetime(df_local['PD_Departure_Date'], errors='coerce')
    df_global = df_local  # Make it available globally

    # 3) Load airline types (airline_type.csv) from GCS
    df_airline_type_local = download_csv_from_gcs(
        bucket_name,
        "airline_type.csv"
    )
    airline_type_map = dict(zip(df_airline_type_local["Airline"], df_airline_type_local["Type"]))

    print("Startup: precomputed + fallback DF + airline_type_map loaded from GCS!")
    yield
    print("Shutdown: cleaning up if needed...")

########################################################
# Create FastAPI App with the lifespan manager
########################################################
app = FastAPI(lifespan=lifespan)

# Enable CORS so that requests from any front-end domain can succeed
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

    # Instead of starting from earliest_booking_month, we start from 1 (January)
    # so user can see all months before 'departure_month'.
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
        df_filtered = df_global[
            (df_global['PD_Origin'].isin(australian_airports)) &
            (df_global['PD_Destination'] == destination_iata) &
            (df_global['PD_Departure_Date'].dt.month == departure_month)
        ].copy()

        df_filtered['Booking_Month_Only'] = df_filtered['created'].dt.month
        df_filtered = df_filtered[df_filtered['Booking_Month_Only'] == booking_m]

        # Clean price
        df_filtered['Price Per Passenger (AUD)'] = (
            df_filtered['Price Per Passenger (AUD)']
            .astype(str)
            .str.replace('[^0-9.]','', regex=True)
            .astype(float)
        )

        # Recency weight
        df_filtered['Recency_Weight'] = (
            df_filtered['created'].dt.year - df_filtered['created'].dt.year.min() + 1
        )

        # airline_weight from airline_type_map
        def airline_weight(carrier_name: str):
            ctype = airline_type_map.get(carrier_name, "Unknown").lower()
            if ctype == "premium":
                return 1.5
            elif ctype == "budget":
                return 1.0
            else:
                return 1.0

        df_filtered['Airline_Weight'] = df_filtered['PD_Carrier'].apply(airline_weight)

        # If user wants only "premium" or "budget", filter
        if airline_filter is not None:
            filter_lower = airline_filter.lower()
            df_filtered['Carrier_Type'] = df_filtered['PD_Carrier'].apply(
                lambda c: airline_type_map.get(c, "Unknown").lower()
            )
            df_filtered = df_filtered[df_filtered['Carrier_Type'] == filter_lower]
            if len(df_filtered) == 0:
                results.append({
                    "booking_month": booking_m,
                    "adjusted_avg_price": None,
                    "source": f"fallback_{airline_filter}"
                })
                continue

        # Outlier removal
        df_filtered['Monthly_Median'] = df_filtered.groupby('Booking_Month_Only')['Price Per Passenger (AUD)'].transform('median')
        df_filtered['Monthly_Deviation'] = abs(df_filtered['Price Per Passenger (AUD)'] - df_filtered['Monthly_Median'])
        df_filtered['Outlier_Threshold'] = df_filtered['Monthly_Median'] * 0.40
        df_filtered = df_filtered[df_filtered['Monthly_Deviation'] <= df_filtered['Outlier_Threshold']]

        if len(df_filtered) == 0:
            results.append({
                "booking_month": booking_m,
                "adjusted_avg_price": None,
                "source": "fallback"
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
                "source": "fallback"
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
