from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from ..sql.slot_registry import slot_loader
from ..sql.step_decomposer import decomposer
from ..sql.step_executor import execute_steps

router = APIRouter()


class QueryRequest(BaseModel):
    query: str
    slot_id: str = "boutique-v1"


class QueryResponse(BaseModel):
    columns: list[str]
    rows: list[list]


class ErrorResponse(BaseModel):
    error: str


@router.post("/execute")
def execute_query(request: QueryRequest):
    try:
        db = slot_loader.get_database(request.slot_id)
        result = db.execute(request.query)
        return QueryResponse(columns=result["columns"], rows=result["rows"])
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@router.get("/schema")
def get_schema(slot_id: str = "boutique-v1"):
    try:
        db = slot_loader.get_database(slot_id)
        return db.get_schema()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


class StepResponse(BaseModel):
    id: str
    label: str
    explanation: str
    highlight_start: int
    highlight_end: int
    columns: list[str]
    rows: list[list]
    subquery_steps: Optional[list] = None

class StepsResponse(BaseModel):
    steps: list[StepResponse]


@router.post("/steps", response_model=StepsResponse)
def get_steps(req: QueryRequest):
    try:
        db = slot_loader.get_database(req.slot_id)
        step_metas = decomposer.decompose(req.query)
        steps = execute_steps(step_metas, db)
        return StepsResponse(steps=steps)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})
    except Exception as e:
        raise HTTPException(status_code=400, detail={"error": f"Erreur lors de la décomposition : {e}"})
