from __future__ import annotations

import os
import json
import sqlite3
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .models import LoginRequest, ResetPasswordRequest, SignupRequest, TokenResponse, UserPublic
from .utils import create_jwt, env

router = APIRouter(prefix="/auth", tags=["auth"])

_DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    conn = _get_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
            """
        )

        # Lightweight migrations (add columns if missing)
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "role" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'USER'")
        if "status" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'")
        if "created_at" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN created_at TEXT")

        # Backfill created_at for existing users (SQLite cannot add a column with non-constant default)
        conn.execute("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL OR created_at = ''")

        # Bootstrap: ensure admin user exists and has ADMIN role + configured password
        admin_email = _admin_email()
        admin_pw_hash = _hash_password(_admin_password())
        cur = conn.execute("SELECT id FROM users WHERE lower(email) = ?", (admin_email,))
        existing = cur.fetchone()
        if existing is None:
            conn.execute(
                "INSERT INTO users (email, password_hash, role, status, created_at) VALUES (?, ?, 'ADMIN', 'ACTIVE', datetime('now'))",
                (admin_email, admin_pw_hash),
            )
        else:
            conn.execute(
                "UPDATE users SET role='ADMIN', status='ACTIVE', password_hash=? WHERE id = ?",
                (admin_pw_hash, int(existing["id"])),
            )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY,
                profile_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                profile_json TEXT NOT NULL,
                analysis_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def _set_user_password_by_email(*, email: str, new_password: str) -> None:
    conn = _get_conn()
    try:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email.lower(),)).fetchone()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        password_hash = _hash_password(new_password)
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, int(row["id"])))
        conn.commit()
    finally:
        conn.close()


def _admin_email() -> str:
    return env("ADMIN_EMAIL", "admin@gmail.com").lower()


def _admin_password() -> str:
    return env("ADMIN_PASSWORD", "Admin@123")


def get_user_meta(user_id: int) -> Optional[dict]:
    conn = _get_conn()
    try:
        cur = conn.execute(
            "SELECT id, email, role, status, created_at FROM users WHERE id = ?",
            (int(user_id),),
        )
        row = cur.fetchone()
        if row is None:
            return None
        email = str(row["email"])
        role = str(row["role"] or "USER")
        status = str(row["status"] or "ACTIVE")
        created_at = str(row["created_at"] or "")
        return {"id": int(row["id"]), "email": email, "role": role, "status": status, "created_at": created_at}
    finally:
        conn.close()


def list_users() -> list[dict]:
    conn = _get_conn()
    try:
        cur = conn.execute("SELECT id, email, role, status, created_at FROM users ORDER BY id DESC")
        rows = cur.fetchall() or []
        out: list[dict] = []
        for r in rows:
            email = str(r["email"])
            role = str(r["role"] or "USER")
            out.append(
                {
                    "id": int(r["id"]),
                    "email": email,
                    "role": role,
                    "status": str(r["status"] or "ACTIVE"),
                    "created_at": str(r["created_at"] or ""),
                }
            )
        return out
    finally:
        conn.close()


def update_user(*, user_id: int, role: Optional[str] = None, status: Optional[str] = None) -> None:
    conn = _get_conn()
    try:
        sets = []
        params: list = []
        if role is not None:
            sets.append("role = ?")
            params.append(str(role))
        if status is not None:
            sets.append("status = ?")
            params.append(str(status))
        if not sets:
            return
        params.append(int(user_id))
        conn.execute(f"UPDATE users SET {', '.join(sets)} WHERE id = ?", tuple(params))
        conn.commit()
    finally:
        conn.close()


def delete_user(user_id: int) -> None:
    conn = _get_conn()
    try:
        # Cascade delete application data owned by the user
        conn.execute("DELETE FROM user_goals WHERE user_id = ?", (int(user_id),))
        conn.execute("DELETE FROM user_profiles WHERE user_id = ?", (int(user_id),))
        conn.execute("DELETE FROM users WHERE id = ?", (int(user_id),))
        conn.commit()
    finally:
        conn.close()


def admin_stats() -> dict:
    conn = _get_conn()
    try:
        u = conn.execute("SELECT COUNT(1) AS n FROM users").fetchone()
        g = conn.execute("SELECT COUNT(1) AS n FROM user_goals").fetchone()
        total_users = int(u["n"]) if u is not None else 0
        total_goals = int(g["n"]) if g is not None else 0
        return {"total_users": total_users, "total_goals": total_goals}
    finally:
        conn.close()


def create_user_goal(*, user_id: int, profile: dict, analysis: dict) -> int:
    conn = _get_conn()
    try:
        cur = conn.execute(
            """
            INSERT INTO user_goals (user_id, profile_json, analysis_json, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
            """,
            (int(user_id), json.dumps(profile), json.dumps(analysis)),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()


def list_user_goals(user_id: int) -> list[dict]:
    conn = _get_conn()
    try:
        cur = conn.execute(
            "SELECT id, profile_json, analysis_json, updated_at FROM user_goals WHERE user_id = ? ORDER BY updated_at DESC",
            (int(user_id),),
        )
        rows = cur.fetchall() or []
        out: list[dict] = []
        for r in rows:
            try:
                profile = json.loads(r["profile_json"]) if r["profile_json"] else None
                analysis = json.loads(r["analysis_json"]) if r["analysis_json"] else None
            except Exception:
                continue
            if not isinstance(profile, dict) or not isinstance(analysis, dict):
                continue
            out.append({"id": int(r["id"]), "profile": profile, "analysis": analysis})
        return out
    finally:
        conn.close()


def get_user_goal(*, user_id: int, goal_id: int) -> Optional[dict]:
    conn = _get_conn()
    try:
        cur = conn.execute(
            "SELECT id, profile_json, analysis_json FROM user_goals WHERE user_id = ? AND id = ?",
            (int(user_id), int(goal_id)),
        )
        r = cur.fetchone()
        if r is None:
            return None
        try:
            profile = json.loads(r["profile_json"]) if r["profile_json"] else None
            analysis = json.loads(r["analysis_json"]) if r["analysis_json"] else None
        except Exception:
            return None
        if not isinstance(profile, dict) or not isinstance(analysis, dict):
            return None
        return {"id": int(r["id"]), "profile": profile, "analysis": analysis}
    finally:
        conn.close()


def get_user_profile(user_id: int) -> Optional[dict]:
    conn = _get_conn()
    try:
        cur = conn.execute("SELECT profile_json FROM user_profiles WHERE user_id = ?", (int(user_id),))
        row = cur.fetchone()
        if row is None:
            return None
        raw = row["profile_json"]
        if not raw:
            return None
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None
    finally:
        conn.close()


def upsert_user_profile(*, user_id: int, profile: dict) -> None:
    conn = _get_conn()
    try:
        conn.execute(
            """
            INSERT INTO user_profiles (user_id, profile_json, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                profile_json=excluded.profile_json,
                updated_at=datetime('now')
            """,
            (int(user_id), json.dumps(profile)),
        )
        conn.commit()
    finally:
        conn.close()


def _hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at most 72 bytes (bcrypt limit)",
        )
    return _pwd_context.hash(password)


def _verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(password, password_hash)


def _get_user_by_email(email: str) -> Optional[sqlite3.Row]:
    conn = _get_conn()
    try:
        cur = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        return cur.fetchone()
    finally:
        conn.close()


def _create_user(email: str, password: str) -> sqlite3.Row:
    conn = _get_conn()
    try:
        password_hash = _hash_password(password)
        role = "ADMIN" if email.lower() == _admin_email() else "USER"
        conn.execute(
            "INSERT INTO users (email, password_hash, role, status, created_at) VALUES (?, ?, ?, 'ACTIVE', datetime('now'))",
            (email.lower(), password_hash, role),
        )
        conn.commit()
        cur = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("Failed to create user")
        return row
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )
    finally:
        conn.close()


def _jwt_secret() -> str:
    return env("JWT_SECRET", "dev-secret-change-me")


def _jwt_expires_minutes() -> int:
    raw = os.getenv("JWT_EXPIRES_MINUTES", "1440")
    try:
        return int(raw)
    except ValueError:
        return 1440


@router.on_event("startup")
def _on_startup() -> None:
    _init_db()


@router.post("/signup", response_model=UserPublic)
def signup(payload: SignupRequest) -> UserPublic:
    row = _create_user(payload.email, payload.password)
    return UserPublic(id=int(row["id"]), email=str(row["email"]))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    row = _get_user_by_email(payload.email)
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not _verify_password(payload.password, str(row["password_hash"])):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if str(row["status"] or "ACTIVE") == "DISABLED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    email = str(row["email"])
    role = str(row["role"] or "USER")

    token = create_jwt(
        payload={"sub": str(row["id"]), "email": email, "role": role},
        secret=_jwt_secret(),
        expires_minutes=_jwt_expires_minutes(),
    )
    return TokenResponse(access_token=token)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest) -> dict:
    _set_user_password_by_email(email=str(payload.email), new_password=str(payload.new_password))
    return {"ok": True}


def get_current_user(token: str = Depends(_oauth2_scheme)) -> UserPublic:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
        sub = payload.get("sub")
        email = payload.get("email")
        if not sub or not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return UserPublic(id=int(sub), email=str(email))
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
