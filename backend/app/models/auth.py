"""
Gestion des comptes formateurs, sessions et apprenants.
"""
import sqlite3
import secrets
import string
from datetime import datetime
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthStore:

    def __init__(self, db_path: str):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init()
        self._create_default_formateur()

    def _init(self):
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS formateurs (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                login         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at    TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                code          TEXT UNIQUE NOT NULL,
                nom           TEXT NOT NULL,
                slot_id       TEXT NOT NULL,
                formateur_id  INTEGER REFERENCES formateurs(id),
                actif         INTEGER NOT NULL DEFAULT 1,
                created_at    TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS apprenants (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                pseudo        TEXT NOT NULL,
                session_id    INTEGER REFERENCES sessions(id),
                created_at    TEXT NOT NULL,
                UNIQUE(pseudo, session_id)
            );
        """)
        self._conn.commit()

    def _create_default_formateur(self):
        """Crée le compte formateur par défaut s'il n'existe pas encore."""
        existing = self._conn.execute("SELECT id FROM formateurs").fetchone()
        if not existing:
            import os
            password = os.getenv("FORMATEUR_DEFAULT_PASSWORD", "admin")
            self._conn.execute(
                "INSERT INTO formateurs (login, password_hash, created_at) VALUES (?, ?, ?)",
                ("formateur", pwd_context.hash(password), datetime.utcnow().isoformat())
            )
            self._conn.commit()
            print(f"[Auth] Compte formateur créé — login: formateur / mot de passe: {password}")

    # ── Formateur ────────────────────────────────────────────────────────────

    def authenticate_formateur(self, login: str, password: str) -> dict | None:
        row = self._conn.execute(
            "SELECT id, login, password_hash FROM formateurs WHERE login = ?", (login,)
        ).fetchone()
        if not row:
            return None
        if not pwd_context.verify(password, row["password_hash"]):
            return None
        return {"id": row["id"], "login": row["login"]}

    # ── Sessions ─────────────────────────────────────────────────────────────

    def create_session(self, nom: str, slot_id: str, formateur_id: int) -> dict:
        code = self._generate_code()
        self._conn.execute(
            "INSERT INTO sessions (code, nom, slot_id, formateur_id, actif, created_at) VALUES (?, ?, ?, ?, 1, ?)",
            (code, nom, slot_id, formateur_id, datetime.utcnow().isoformat())
        )
        self._conn.commit()
        row = self._conn.execute("SELECT * FROM sessions WHERE code = ?", (code,)).fetchone()
        return dict(row)

    def list_sessions(self, formateur_id: int) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM sessions WHERE formateur_id = ? ORDER BY created_at DESC",
            (formateur_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    def get_session_by_code(self, code: str) -> dict | None:
        row = self._conn.execute(
            "SELECT * FROM sessions WHERE code = ? AND actif = 1", (code.upper(),)
        ).fetchone()
        return dict(row) if row else None

    def toggle_session(self, session_id: int, actif: bool, formateur_id: int):
        self._conn.execute(
            "UPDATE sessions SET actif = ? WHERE id = ? AND formateur_id = ?",
            (int(actif), session_id, formateur_id)
        )
        self._conn.commit()

    # ── Apprenants ───────────────────────────────────────────────────────────

    def get_session_by_id(self, session_id: int) -> dict | None:
        row = self._conn.execute(
            "SELECT * FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()
        return dict(row) if row else None

    def list_session_apprenants(self, session_id: int) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM apprenants WHERE session_id = ? ORDER BY created_at",
            (session_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    def get_or_create_apprenant(self, pseudo: str, session_id: int) -> dict:
        row = self._conn.execute(
            "SELECT * FROM apprenants WHERE pseudo = ? AND session_id = ?",
            (pseudo, session_id)
        ).fetchone()
        if row:
            return dict(row)
        self._conn.execute(
            "INSERT INTO apprenants (pseudo, session_id, created_at) VALUES (?, ?, ?)",
            (pseudo, session_id, datetime.utcnow().isoformat())
        )
        self._conn.commit()
        row = self._conn.execute(
            "SELECT * FROM apprenants WHERE pseudo = ? AND session_id = ?",
            (pseudo, session_id)
        ).fetchone()
        return dict(row)

    # ── Utilitaires ──────────────────────────────────────────────────────────

    def _generate_code(self) -> str:
        """Génère un code OAK-XXX unique (lettres majuscules + chiffres)."""
        chars = string.ascii_uppercase + string.digits
        while True:
            code = "OAK-" + "".join(secrets.choice(chars) for _ in range(3))
            existing = self._conn.execute("SELECT id FROM sessions WHERE code = ?", (code,)).fetchone()
            if not existing:
                return code
