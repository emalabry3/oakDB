from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..sql.slot_registry import auth_store
from ..models.jwt_utils import create_token, require_formateur
from fastapi import Depends

router = APIRouter()


class LoginRequest(BaseModel):
    login: str
    password: str


class JoinRequest(BaseModel):
    code: str
    pseudo: str


class CreateSessionRequest(BaseModel):
    nom: str
    slot_id: str


@router.post("/login")
def login(req: LoginRequest):
    formateur = auth_store.authenticate_formateur(req.login, req.password)
    if not formateur:
        raise HTTPException(status_code=401, detail="Login ou mot de passe incorrect.")
    token = create_token({"sub": f"formateur:{formateur['id']}", "role": "formateur",
                          "login": formateur["login"], "id": formateur["id"]})
    return {"token": token, "role": "formateur", "login": formateur["login"]}


@router.post("/join")
def join(req: JoinRequest):
    session = auth_store.get_session_by_code(req.code.strip().upper())
    if not session:
        raise HTTPException(status_code=404, detail="Code de session invalide ou session inactive.")
    if not req.pseudo.strip():
        raise HTTPException(status_code=400, detail="Le pseudo ne peut pas être vide.")
    apprenant = auth_store.get_or_create_apprenant(req.pseudo.strip(), session["id"])
    token = create_token({
        "sub": f"apprenant:{apprenant['id']}",
        "role": "apprenant",
        "pseudo": apprenant["pseudo"],
        "id": apprenant["id"],
        "session_id": session["id"],
        "slot_id": session["slot_id"],
    })
    return {
        "token": token,
        "role": "apprenant",
        "pseudo": apprenant["pseudo"],
        "slot_id": session["slot_id"],
        "session_code": session["code"],
    }


@router.post("/sessions")
def create_session(req: CreateSessionRequest, user: dict = Depends(require_formateur)):
    session = auth_store.create_session(req.nom, req.slot_id, user["id"])
    return session


@router.get("/sessions")
def list_sessions(user: dict = Depends(require_formateur)):
    return auth_store.list_sessions(user["id"])


@router.patch("/sessions/{session_id}/toggle")
def toggle_session(session_id: int, actif: bool, user: dict = Depends(require_formateur)):
    auth_store.toggle_session(session_id, actif, user["id"])
    return {"ok": True}
