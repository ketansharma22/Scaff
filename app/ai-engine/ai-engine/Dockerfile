FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[dev]"

COPY . .

EXPOSE 8000
