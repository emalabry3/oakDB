from fastapi import APIRouter, HTTPException
from ..sql.slot_registry import slot_loader

router = APIRouter()


@router.get("")
def list_slots():
    return slot_loader.list_slots()


@router.get("/{slot_id}/schema")
def get_slot_schema(slot_id: str):
    try:
        db = slot_loader.get_database(slot_id)
        return db.get_schema()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
