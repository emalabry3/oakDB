import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.sql import router as sql_router
from app.api.slots import router as slots_router
from app.api.exercises import router as exercises_router
from app.api.auth import router as auth_router
from app.api.progress import router as progress_router
from app.api.sandbox import router as sandbox_router
from app.sql.slot_registry import slot_loader


def get_slot_loader():
    return slot_loader


app = FastAPI(title="oakDB", version="0.1.0")

# CORS : en prod, on sert le frontend depuis FastAPI donc pas besoin de CORS large.
# En dev, on autorise Vite (localhost:5173).
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


app.include_router(auth_router, prefix="/auth")
app.include_router(sql_router, prefix="/sql")
app.include_router(slots_router, prefix="/slots")
app.include_router(exercises_router, prefix="/slots")
app.include_router(progress_router, prefix="/progress")
app.include_router(sandbox_router, prefix="/sandbox")

# Servir le frontend React en production (npm run build → dist/)
_static_dir = Path(__file__).parent.parent.parent.parent / "frontend" / "dist"
if _static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_static_dir / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        """Redirige toutes les routes inconnues vers index.html (SPA)."""
        index = _static_dir / "index.html"
        return FileResponse(str(index))
