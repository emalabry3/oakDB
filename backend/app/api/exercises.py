from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..sql.slot_registry import slot_loader, progress_store
from ..sql.validator import compare_results
from ..models.jwt_utils import get_current_user

router = APIRouter()


class ValidateRequest(BaseModel):
    query: str
    slot_id: str
    used_hints: bool = False


@router.get("/{slot_id}/notebook")
def get_notebook(slot_id: str):
    try:
        return slot_loader.get_notebook(slot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{slot_id}/progress")
def get_progress(slot_id: str, user: dict | None = Depends(get_current_user)):
    user_id = user["sub"] if user else "anonymous"
    return progress_store.get_all_statuses(slot_id, user_id)


@router.post("/{slot_id}/exercises/{exercise_id}/validate")
def validate_exercise(
    slot_id: str,
    exercise_id: str,
    req: ValidateRequest,
    user: dict | None = Depends(get_current_user)
):
    user_id = user["sub"] if user else "anonymous"

    # Récupérer la réponse de référence
    answer = slot_loader.get_answer(slot_id, exercise_id)
    if not answer:
        raise HTTPException(status_code=404, detail="Exercice introuvable.")

    # Récupérer les métadonnées (order_sensitive)
    meta = slot_loader.get_exercise_meta(slot_id, exercise_id)
    order_sensitive = meta.get("order_sensitive", False) if meta else False

    # Exécuter la requête soumise
    try:
        db = slot_loader.get_database(slot_id)
        result = db.execute(req.query)
    except ValueError as e:
        progress_store.record_attempt(slot_id, exercise_id, req.query, False, str(e), user_id)
        progress_store.update_status(slot_id, exercise_id, 'en_cours', user_id)
        return {"success": False, "feedback": str(e)}

    # Comparer
    success, feedback = compare_results(result, answer, order_sensitive)

    # Persister
    if success:
        new_status = 'reussi_avec_indices' if req.used_hints else 'reussi'
        progress_store.update_status(slot_id, exercise_id, new_status, user_id)
    else:
        progress_store.update_status(slot_id, exercise_id, 'en_cours', user_id)

    progress_store.record_attempt(slot_id, exercise_id, req.query, success, feedback, user_id)

    return {"success": success, "feedback": feedback}
