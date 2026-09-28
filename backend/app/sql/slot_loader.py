"""
Charge et gère les slots pédagogiques depuis le filesystem.
"""
import json
import sqlite3
import re
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from dataclasses import dataclass, field
import duckdb


class _JsonEncoder(json.JSONEncoder):
    """Sérialise les types Python non supportés nativement par json."""
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


@dataclass
class SlotInfo:
    id: str
    name: str
    description: str
    difficulty: str
    version: str
    author: str
    tags: list[str]
    sql_script: str
    notebook: dict


class SlotDatabase:
    """Connexion DuckDB in-memory pour un slot donné."""

    def __init__(self, slot_id: str, sql_script: str):
        self.slot_id = slot_id
        self.conn = duckdb.connect(":memory:")
        self.conn.execute(sql_script)

    def execute(self, query: str) -> dict:
        try:
            result = self.conn.execute(query)
            columns = [desc[0] for desc in result.description]
            rows = result.fetchall()
            return {"columns": columns, "rows": [list(r) for r in rows]}
        except Exception as e:
            raise ValueError(self._format_error(e))

    def get_schema(self) -> list[dict]:
        tables_result = self.conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name"
        ).fetchall()
        schema = []
        for (table_name,) in tables_result:
            cols_result = self.conn.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = 'main' AND table_name = ? ORDER BY ordinal_position",
                [table_name]
            ).fetchall()
            schema.append({
                "table": table_name,
                "columns": [{"name": col, "type": dtype} for col, dtype in cols_result]
            })
        return schema

    def _format_error(self, e: Exception) -> str:
        msg = str(e)
        if "does not exist" in msg or "Catalog Error" in msg:
            m = re.search(r'"([^"]+)"', msg)
            name = m.group(1) if m else "inconnue"
            return f"La table ou colonne « {name} » n'existe pas dans cette base de données."
        if "syntax error" in msg.lower() or "Parser Error" in msg:
            return "Erreur de syntaxe SQL. Vérifiez la structure de votre requête."
        if "Binder Error" in msg:
            return "Référence invalide : une colonne ou table est introuvable."
        if "Conversion Error" in msg:
            return "Erreur de type : une valeur ne correspond pas au type attendu."
        return f"Erreur d'exécution : {msg}"


class SlotLoader:
    """Scanne app/slots/ et charge tous les slots au démarrage."""

    def __init__(self, slots_dir: str, db_path: str):
        self.slots: dict[str, SlotInfo] = {}
        self.databases: dict[str, SlotDatabase] = {}
        self._db_path = db_path
        self._init_sqlite()
        self._load_all(slots_dir)

    def _init_sqlite(self):
        """Crée la table SQLite pour les réponses pré-calculées."""
        self._sqlite = sqlite3.connect(self._db_path, check_same_thread=False)
        self._sqlite.execute("""
            CREATE TABLE IF NOT EXISTS exercise_answers (
                slot_id     TEXT NOT NULL,
                exercise_id TEXT NOT NULL,
                columns_json TEXT NOT NULL,
                rows_json    TEXT NOT NULL,
                PRIMARY KEY (slot_id, exercise_id)
            )
        """)
        self._sqlite.commit()

    def _load_all(self, slots_dir: str):
        path = Path(slots_dir)
        if not path.exists():
            print(f"[SlotLoader] Dossier slots introuvable : {slots_dir}")
            return

        for slot_dir in sorted(path.iterdir()):
            if not slot_dir.is_dir():
                continue
            try:
                self._load_slot(slot_dir)
            except Exception as e:
                print(f"[SlotLoader] Erreur lors du chargement de {slot_dir.name} : {e}")

    def _load_slot(self, slot_dir: Path):
        # Lire les 3 fichiers obligatoires
        slot_json   = json.loads((slot_dir / "slot.json").read_text(encoding="utf-8"))
        sql_script  = (slot_dir / "database.sql").read_text(encoding="utf-8")
        notebook    = json.loads((slot_dir / "notebook.json").read_text(encoding="utf-8"))

        slot_id = slot_json["id"]

        info = SlotInfo(
            id=slot_id,
            name=slot_json["name"],
            description=slot_json.get("description", ""),
            difficulty=slot_json.get("difficulty", "debutant"),
            version=slot_json.get("version", "1.0"),
            author=slot_json.get("author", ""),
            tags=slot_json.get("tags", []),
            sql_script=sql_script,
            notebook=notebook,
        )

        db = SlotDatabase(slot_id, sql_script)

        self.slots[slot_id] = info
        self.databases[slot_id] = db

        # Pré-calculer les réponses
        count = self._precalculate_answers(slot_id, notebook, db)
        print(f"[SlotLoader] Slot « {info.name} » chargé — {count} réponse(s) pré-calculée(s)")

    def _precalculate_answers(self, slot_id: str, notebook: dict, db: SlotDatabase) -> int:
        count = 0
        for chapter in notebook.get("chapters", []):
            for lesson in chapter.get("lessons", []):
                for ex in lesson.get("exercises", []):
                    try:
                        result = db.execute(ex["answer_query"])
                        self._sqlite.execute(
                            "INSERT OR REPLACE INTO exercise_answers VALUES (?, ?, ?, ?)",
                            (
                                slot_id,
                                ex["id"],
                                json.dumps(result["columns"], cls=_JsonEncoder),
                                json.dumps(result["rows"], cls=_JsonEncoder),
                            )
                        )
                        count += 1
                    except Exception as e:
                        print(f"[SlotLoader] Réponse introuvable pour {ex['id']} : {e}")
        self._sqlite.commit()
        return count

    def get_database(self, slot_id: str) -> SlotDatabase:
        if slot_id not in self.databases:
            raise ValueError(f"Slot « {slot_id} » introuvable.")
        return self.databases[slot_id]

    def list_slots(self) -> list[dict]:
        return [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "difficulty": s.difficulty,
                "tags": s.tags,
            }
            for s in self.slots.values()
        ]

    def default_slot_id(self) -> str | None:
        if self.slots:
            return next(iter(self.slots))
        return None

    def get_answer(self, slot_id: str, exercise_id: str) -> dict | None:
        row = self._sqlite.execute(
            "SELECT columns_json, rows_json FROM exercise_answers WHERE slot_id=? AND exercise_id=?",
            (slot_id, exercise_id)
        ).fetchone()
        if row:
            return {"columns": json.loads(row[0]), "rows": json.loads(row[1])}
        return None

    def get_notebook(self, slot_id: str) -> dict:
        """Retourne le notebook sans les answer_query."""
        info = self.slots.get(slot_id)
        if not info:
            raise ValueError(f"Slot '{slot_id}' introuvable.")
        nb = info.notebook
        # Copie profonde sans answer_query
        import copy
        clean = copy.deepcopy(nb)
        for ch in clean.get("chapters", []):
            for le in ch.get("lessons", []):
                for ex in le.get("exercises", []):
                    ex.pop("answer_query", None)
        return clean

    def get_exercise_meta(self, slot_id: str, exercise_id: str) -> dict | None:
        """Retourne les métadonnées d'un exercice (avec answer_query, pour validation)."""
        info = self.slots.get(slot_id)
        if not info:
            return None
        for ch in info.notebook.get("chapters", []):
            for le in ch.get("lessons", []):
                for ex in le.get("exercises", []):
                    if ex["id"] == exercise_id:
                        return ex
        return None
