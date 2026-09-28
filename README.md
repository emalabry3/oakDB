# oakDB

Base de données pédagogique — étape 01 : bootstrap.

## Démarrage en développement (sans Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

L'API est disponible sur http://localhost:8000 — vérifier avec http://localhost:8000/health.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L'interface est disponible sur http://localhost:5173.

## Démarrage avec Docker

```bash
docker compose -f docker-compose.dev.yml up --build
```

## Variables d'environnement

Copier `.env.example` en `.env` et ajuster les valeurs avant de lancer en production.
