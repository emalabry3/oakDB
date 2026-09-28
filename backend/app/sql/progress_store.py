"""
Persistance de la progression des exercices en SQLite.
Utilisateur 'anonymous' par défaut (remplacé par vrai user à l'étape 08).
"""
import sqlite3
import json
from datetime import datetime

STATUS_ORDER = ['non_commence', 'en_cours', 'reussi_avec_indices', 'reussi']

class ProgressStore:

    def __init__(self, db_path: str):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init()

    def _init(self):
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS exercise_progress (
                user_id      TEXT NOT NULL DEFAULT 'anonymous',
                slot_id      TEXT NOT NULL,
                exercise_id  TEXT NOT NULL,
                status       TEXT NOT NULL DEFAULT 'non_commence',
                updated_at   TEXT NOT NULL,
                PRIMARY KEY (user_id, slot_id, exercise_id)
            );
            CREATE TABLE IF NOT EXISTS attempt_history (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      TEXT NOT NULL DEFAULT 'anonymous',
                slot_id      TEXT NOT NULL,
                exercise_id  TEXT NOT NULL,
                query        TEXT NOT NULL,
                success      INTEGER NOT NULL,
                feedback     TEXT,
                submitted_at TEXT NOT NULL
            );
        """)
        self._conn.commit()

    def get_status(self, slot_id: str, exercise_id: str, user_id: str = 'anonymous') -> str:
        row = self._conn.execute(
            "SELECT status FROM exercise_progress WHERE user_id=? AND slot_id=? AND exercise_id=?",
            (user_id, slot_id, exercise_id)
        ).fetchone()
        return row[0] if row else 'non_commence'

    def get_all_statuses(self, slot_id: str, user_id: str = 'anonymous') -> dict[str, str]:
        rows = self._conn.execute(
            "SELECT exercise_id, status FROM exercise_progress WHERE user_id=? AND slot_id=?",
            (user_id, slot_id)
        ).fetchall()
        return {ex_id: status for ex_id, status in rows}

    def update_status(self, slot_id: str, exercise_id: str, status: str, user_id: str = 'anonymous'):
        """Met à jour le statut seulement si le nouveau statut est plus avancé."""
        current = self.get_status(slot_id, exercise_id, user_id)
        current_rank = STATUS_ORDER.index(current) if current in STATUS_ORDER else 0
        new_rank = STATUS_ORDER.index(status) if status in STATUS_ORDER else 0
        if new_rank > current_rank:
            self._conn.execute(
                "INSERT OR REPLACE INTO exercise_progress VALUES (?, ?, ?, ?, ?)",
                (user_id, slot_id, exercise_id, status, datetime.utcnow().isoformat())
            )
            self._conn.commit()

    def record_attempt(self, slot_id: str, exercise_id: str, query: str,
                       success: bool, feedback: str, user_id: str = 'anonymous'):
        self._conn.execute(
            "INSERT INTO attempt_history (user_id, slot_id, exercise_id, query, success, feedback, submitted_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, slot_id, exercise_id, query, int(success), feedback, datetime.utcnow().isoformat())
        )
        self._conn.commit()

    def get_attempts(self, slot_id: str, exercise_id: str, user_id: str) -> list[dict]:
        """Historique des tentatives pour un exercice donné."""
        rows = self._conn.execute(
            "SELECT query, success, feedback, submitted_at FROM attempt_history "
            "WHERE user_id=? AND slot_id=? AND exercise_id=? ORDER BY submitted_at DESC",
            (user_id, slot_id, exercise_id)
        ).fetchall()
        return [
            {"query": r[0], "success": bool(r[1]), "feedback": r[2], "submitted_at": r[3]}
            for r in rows
        ]

    def get_multi_user_statuses(self, slot_id: str, user_ids: list[str]) -> dict[str, dict[str, str]]:
        """Pour plusieurs user_ids, retourne {user_id: {exercise_id: status}}."""
        if not user_ids:
            return {}
        placeholders = ",".join("?" * len(user_ids))
        rows = self._conn.execute(
            f"SELECT user_id, exercise_id, status FROM exercise_progress "
            f"WHERE slot_id=? AND user_id IN ({placeholders})",
            [slot_id] + user_ids
        ).fetchall()
        result: dict[str, dict[str, str]] = {uid: {} for uid in user_ids}
        for user_id, exercise_id, status in rows:
            result[user_id][exercise_id] = status
        return result
