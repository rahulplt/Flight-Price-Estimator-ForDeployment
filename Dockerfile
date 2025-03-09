FROM python:3.11-slim

WORKDIR /app

# Copy requirements, then install with --no-cache-dir to ensure a fresh fetch
COPY requirements.txt /app
RUN pip install --no-cache-dir -r requirements.txt

# Copy your FastAPI code
COPY main.py /app

# Install dependencies explicitly
RUN pip install --no-cache-dir google-cloud-secret-manager fastapi uvicorn pandas google-cloud-storage

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
