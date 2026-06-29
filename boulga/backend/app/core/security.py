import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

ACCESS_COOKIE = "boulga_access"
REFRESH_COOKIE = "boulga_refresh"

_REFERRAL_ALPHABET = string.ascii_uppercase + string.digits


def generate_referral_code(length: int = 8) -> str:
    return "".join(secrets.choice(_REFERRAL_ALPHABET) for _ in range(length))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_jwt(payload: dict, expires_delta: Optional[timedelta] = None) -> str:
    data = payload.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    data["exp"] = expire
    data["iat"] = datetime.now(timezone.utc)
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(payload: dict) -> str:
    data = payload.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    data["exp"] = expire
    data["iat"] = datetime.now(timezone.utc)
    return jwt.encode(data, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
    )


def decode_refresh_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.JWT_REFRESH_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
    )


def create_reset_token(email: str) -> str:
    return create_jwt(
        {"email": email, "purpose": "reset"},
        expires_delta=timedelta(hours=1),
    )


def verify_reset_token(token: str) -> str:
    try:
        payload = decode_jwt(token)
        if payload.get("purpose") != "reset":
            raise ValueError()
        return payload["email"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lien de réinitialisation invalide ou expiré",
        )


def _extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> str:
    """Extrait le token JWT depuis le cookie httpOnly ou le header Authorization."""
    token = request.cookies.get(ACCESS_COOKIE)
    if token:
        return token
    if credentials:
        return credentials.credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token d'authentification manquant",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    token = _extract_token(request, credentials)
    try:
        payload = decode_jwt(token)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès administrateur requis")
    return current_user
