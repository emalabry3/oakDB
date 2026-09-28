"""
Bac à sable : connexion DuckDB éphémère par session, DML activé.
La session est liée à un UUID côté frontend (stocké en mémoire, perdu au refresh).
"""
import uuid
import duckdb
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..sql.slot_registry import slot_loader

router = APIRouter()

# Stockage en mémoire des connexions de sandbox (éphémères)
_sessions: dict[str, duckdb.DuckDBPyConnection] = {}


def _new_session(slot_id: str) -> str:
    """Crée une nouvelle connexion DuckDB pour un slot et retourne le session_id."""
    try:
        info = slot_loader.slots.get(slot_id)
        if not info:
            raise ValueError(f"Slot '{slot_id}' introuvable.")
        conn = duckdb.connect(":memory:")
        conn.execute(info.sql_script)
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Impossible de créer la session : {e}")
    session_id = str(uuid.uuid4())
    _sessions[session_id] = conn
    return session_id


class ExecuteRequest(BaseModel):
    session_id: str
    query: str


@router.post("/{slot_id}/session")
def create_session(slot_id: str):
    """Crée une nouvelle session bac à sable pour un slot."""
    try:
        session_id = _new_session(slot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"session_id": session_id}


@router.post("/{slot_id}/execute")
def execute_sandbox(slot_id: str, req: ExecuteRequest):
    """Exécute une requête SQL (y compris DML) dans la session bac à sable."""
    conn = _sessions.get(req.session_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Session expirée ou introuvable. Réinitialisez le bac à sable.")

    try:
        result = conn.execute(req.query)
        # Certaines requêtes DML ne retournent pas de résultat
        if result.description:
            columns = [desc[0] for desc in result.description]
            rows = [list(r) for r in result.fetchall()]
        else:
            # DML : afficher le nombre de lignes affectées si disponible
            columns = ["message"]
            rows = [["Requête exécutée avec succès."]]
        return {"columns": columns, "rows": rows}
    except Exception as e:
        msg = str(e)
        if "does not exist" in msg or "Catalog Error" in msg:
            import re
            m = re.search(r'"([^"]+)"', msg)
            name = m.group(1) if m else "inconnue"
            raise HTTPException(status_code=400, detail=f"La table ou colonne « {name} » n'existe pas.")
        if "syntax error" in msg.lower() or "Parser Error" in msg:
            raise HTTPException(status_code=400, detail="Erreur de syntaxe SQL.")
        if "Binder Error" in msg:
            raise HTTPException(status_code=400, detail="Référence invalide : colonne ou table introuvable.")
        raise HTTPException(status_code=400, detail=f"Erreur : {msg}")


@router.delete("/{slot_id}/session/{session_id}")
def reset_session(slot_id: str, session_id: str):
    """Réinitialise une session (recrée la base de données)."""
    # Fermer l'ancienne connexion
    old = _sessions.pop(session_id, None)
    if old:
        try:
            old.close()
        except Exception:
            pass
    # Créer une nouvelle session
    try:
        new_id = _new_session(slot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"session_id": new_id}
