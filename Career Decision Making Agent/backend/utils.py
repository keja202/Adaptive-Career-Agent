from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import jwt


def env(name: str, default: str | None = None) -> str:
    val = os.getenv(name)
    if val is None:
        if default is None:
            raise RuntimeError(f"Missing required environment variable: {name}")
        return default
    return val


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_jwt(*, payload: Dict[str, Any], secret: str, expires_minutes: int) -> str:
    exp = utcnow() + timedelta(minutes=expires_minutes)
    to_encode = {**payload, "exp": exp}
    return jwt.encode(to_encode, secret, algorithm="HS256")
