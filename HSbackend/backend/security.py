"""Shared password and bearer-token authentication for both HimSetu clients."""

import base64
import bcrypt
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import Officer


AUTH_SCHEME = HTTPBearer(auto_error=False)
ADMIN_ROLES = {"Officer", "Supervisor", "District Magistrate", "CMO_Monitor", "admin"}


def _auth_secret() -> bytes:
    return os.getenv("HIMSETU_AUTH_SECRET", "change-this-himsetu-development-secret").encode("utf-8")


def _encode(value: dict) -> str:
    raw = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _decode(value: str) -> dict:
    padding = "=" * (-len(value) % 4)
    return json.loads(base64.urlsafe_b64decode((value + padding).encode("ascii")))


def create_access_token(officer: Officer, expires_in: int = 60 * 60 * 12) -> str:
    payload = {
        "sub": str(officer.id),
        "role": str(officer.role.value if hasattr(officer.role, "value") else officer.role),
        "exp": int(time.time()) + expires_in,
    }
    encoded = _encode(payload)
    signature = hmac.new(_auth_secret(), encoded.encode("ascii"), hashlib.sha256).digest()
    return f"{encoded}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode('ascii')}"


def decode_access_token(token: str) -> dict:
    try:
        encoded, supplied_signature = token.split(".", 1)
        expected_signature = hmac.new(_auth_secret(), encoded.encode("ascii"), hashlib.sha256).digest()
        expected = base64.urlsafe_b64encode(expected_signature).rstrip(b"=").decode("ascii")
        if not hmac.compare_digest(expected, supplied_signature):
            raise ValueError("Invalid token signature")
        payload = _decode(encoded)
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("Token expired")
        return payload
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, UnicodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token") from exc


def get_current_officer(
    credentials: HTTPAuthorizationCredentials | None = Depends(AUTH_SCHEME),
    db: Session = Depends(get_db),
) -> Officer:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer authentication required")
    payload = decode_access_token(credentials.credentials)
    officer = db.query(Officer).filter(Officer.id == int(payload["sub"])).first()
    if officer is None or not officer.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is unavailable")
    return officer


def require_admin_user(current_officer: Officer = Depends(get_current_officer)) -> Officer:
    role = current_officer.role.value if hasattr(current_officer.role, "value") else str(current_officer.role)
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_officer


def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt with a secure auto-generated salt.
    
    Args:
        password: Plain-text password string (must be <= 72 bytes)
        
    Returns:
        Cryptographically salted hash string
    """
    # 1. Truncate password to 72 bytes to prevent bcrypt 72-byte limit errors
    password_bytes = password.encode('utf-8')[:72]
    
    # 2. Generate salt and hash
    # gensalt(12) matches your previous bcrypt__rounds=12 setting
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # 3. Return as a UTF-8 string for database storage
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against its stored bcrypt hash.
    
    Args:
        plain_password: Plain-text password to verify
        hashed_password: Stored cryptographic hash string
        
    Returns:
        True if password matches, False otherwise
    """
    # 1. Prepare passwords
    # Truncate input to 72 bytes just like in hash_password
    plain_password_bytes = plain_password.encode('utf-8')[:72]
    hashed_password_bytes = hashed_password.encode('utf-8')
    
    # 2. Compare using bcrypt
    return bcrypt.checkpw(plain_password_bytes, hashed_password_bytes)
