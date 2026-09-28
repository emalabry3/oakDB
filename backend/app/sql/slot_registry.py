"""
Registre global du SlotLoader — module séparé pour éviter les imports circulaires.
Initialisé depuis main.py, importé par les routers.
"""
import os
from pathlib import Path
from .slot_loader import SlotLoader
from .progress_store import ProgressStore
from ..models.auth import AuthStore

SLOTS_DIR = str(Path(__file__).parent.parent / "slots")

# En production Docker, les données SQLite sont dans un volume persistant
_data_dir = os.getenv("OAKDB_DATA_DIR", str(Path(__file__).parent.parent))
DB_PATH   = str(Path(_data_dir) / "oakdb.sqlite")

slot_loader = SlotLoader(SLOTS_DIR, DB_PATH)
progress_store = ProgressStore(DB_PATH)
auth_store = AuthStore(DB_PATH)
