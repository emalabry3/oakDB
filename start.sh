#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# ── couleurs ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[oakDB]${NC} $1"; }
ok()   { echo -e "${GREEN}[oakDB]${NC} $1"; }
warn() { echo -e "${YELLOW}[oakDB]${NC} $1"; }
err()  { echo -e "${RED}[oakDB]${NC} $1"; }

# ── nettoyage à l'arrêt (Ctrl+C) ─────────────────────────────────────────────
cleanup() {
  echo ""
  log "Arrêt en cours..."
  # $BACKEND_PID/$FRONTEND_PID pointent sur sed (dernier du pipe), pas uvicorn/npm
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  pkill -f "uvicorn app.main:app" 2>/dev/null || true
  pkill -f "vite"                  2>/dev/null || true
  ok "Arrêté."
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── vérification des prérequis ───────────────────────────────────────────────
command -v python3 >/dev/null 2>&1 || { err "python3 introuvable"; exit 1; }
command -v node    >/dev/null 2>&1 || { err "node introuvable";    exit 1; }
command -v npm     >/dev/null 2>&1 || { err "npm introuvable";     exit 1; }

# ── backend : venv + dépendances ─────────────────────────────────────────────
log "Préparation du backend..."

if [ ! -d "$BACKEND/.venv" ]; then
  log "Création du virtualenv Python..."
  python3 -m venv "$BACKEND/.venv"
fi

source "$BACKEND/.venv/bin/activate"

# installer / mettre à jour les dépendances si besoin
pip install -q -r "$BACKEND/requirements.txt"

ok "Backend prêt."

# ── frontend : npm install si besoin ─────────────────────────────────────────
log "Préparation du frontend..."

log "Synchronisation des dépendances npm..."
npm --prefix "$FRONTEND" install --silent

ok "Frontend prêt."

# ── lancement ─────────────────────────────────────────────────────────────────
log "Démarrage du backend  → http://localhost:8000"
uvicorn app.main:app --reload --port 8000 --app-dir "$BACKEND" 2>&1 \
  | sed "s/^/$(echo -e "${BLUE}[backend]${NC}") /" &
BACKEND_PID=$!

log "Démarrage du frontend → http://localhost:5173"
npm --prefix "$FRONTEND" run dev 2>&1 \
  | sed "s/^/$(echo -e "${GREEN}[frontend]${NC}") /" &
FRONTEND_PID=$!

echo ""
ok "oakDB lancé. Ctrl+C pour arrêter."
echo ""

# ── attente des processus ─────────────────────────────────────────────────────
wait "$BACKEND_PID" "$FRONTEND_PID"
