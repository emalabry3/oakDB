# ── Étape 1 : build du frontend ──────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ── Étape 2 : image finale Python ────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Dépendances système nécessaires pour DuckDB + bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Code backend
COPY backend/ ./backend/

# Frontend buildé
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Volume pour la base SQLite persistante
VOLUME ["/app/backend/app/oakdb_data"]

ENV OAKDB_DATA_DIR=/app/backend/app/oakdb_data
ENV CORS_ORIGINS=*

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/backend"]
