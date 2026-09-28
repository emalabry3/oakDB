"""
Création et vérification des tokens JWT.
"""
import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM  = "HS256"
security   = HTTPBearer(auto_error=False)


def create_token(payload: dict, expires_hours: int = 24 * 7) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(hours=expires_hours)
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré.")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> dict | None:
    if not credentials:
        return None
    return decode_token(credentials.credentials)


def require_formateur(user: dict | None = Depends(get_current_user)) -> dict:
    if not user or user.get("role") != "formateur":
        raise HTTPException(status_code=403, detail="Accès réservé au formateur.")
    return user


def require_user(user: dict | None = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Authentification requise.")
    return user
