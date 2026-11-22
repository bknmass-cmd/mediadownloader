FROM python:3.11-slim

# Install system dependencies and FFmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend-python/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY backend-python/app ./app

# Expose port (Render automatically provides $PORT)
ENV PORT=8000
EXPOSE 8000

# Start FastAPI server
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
