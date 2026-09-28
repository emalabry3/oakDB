from fastapi import APIRouter, HTTPException, Depends
from ..sql.slot_registry import slot_loader, progress_store, auth_store
from ..models.jwt_utils import get_current_user, require_formateur

router = APIRouter()


def _count_exercises(slot_id: str) -> int:
    """Compte le nombre total d'exercices dans un slot."""
    try:
        nb = slot_loader.get_notebook(slot_id)
    except ValueError:
        return 0
    total = 0
    for ch in nb.get("chapters", []):
        for le in ch.get("lessons", []):
            total += len(le.get("exercises", []))
    return total


def _compute_summary(statuses: dict[str, str], total: int) -> dict:
    """Calcule le résumé de progression à partir des statuts."""
    completed = sum(
        1 for s in statuses.values()
        if s in ("reussi", "reussi_avec_indices")
    )
    in_progress = sum(1 for s in statuses.values() if s == "en_cours")
    pct = round(completed / total * 100) if total > 0 else 0
    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "not_started": total - completed - in_progress,
        "percentage": pct,
    }


@router.get("/me")
def get_my_progress(slot_id: str, user: dict | None = Depends(get_current_user)):
    """Progression personnelle de l'utilisateur connecté sur un slot."""
    user_id = user["sub"] if user else "anonymous"
    statuses = progress_store.get_all_statuses(slot_id, user_id)
    total = _count_exercises(slot_id)
    return {
        "statuses": statuses,
        "summary": _compute_summary(statuses, total),
    }


@router.get("/sessions/{session_id}/progress")
def get_session_progress(session_id: int, user: dict = Depends(require_formateur)):
    """Vue formateur : progression de tous les apprenants d'une session."""
    session = auth_store.get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session introuvable.")
    if session["formateur_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès refusé.")

    slot_id = session["slot_id"]
    total = _count_exercises(slot_id)
    apprenants = auth_store.list_session_apprenants(session_id)

    user_ids = [f"apprenant:{a['id']}" for a in apprenants]
    all_statuses = progress_store.get_multi_user_statuses(slot_id, user_ids)

    result = []
    for a in apprenants:
        uid = f"apprenant:{a['id']}"
        statuses = all_statuses.get(uid, {})
        result.append({
            "id": a["id"],
            "pseudo": a["pseudo"],
            "joined_at": a["created_at"],
            "summary": _compute_summary(statuses, total),
            "statuses": statuses,
        })

    return {
        "session": {
            "id": session["id"],
            "nom": session["nom"],
            "code": session["code"],
            "slot_id": slot_id,
        },
        "total_exercises": total,
        "apprenants": result,
    }


@router.get("/apprenants/{apprenant_id}/exercises/{exercise_id}/attempts")
def get_apprenant_attempts(
    apprenant_id: int,
    exercise_id: str,
    slot_id: str,
    user: dict = Depends(require_formateur),
):
    """Historique des tentatives d'un apprenant sur un exercice."""
    user_id = f"apprenant:{apprenant_id}"
    attempts = progress_store.get_attempts(slot_id, exercise_id, user_id)
    return {"attempts": attempts}
