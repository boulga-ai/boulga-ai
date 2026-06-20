import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


_REFERRAL_ALPHABET = string.ascii_uppercase + string.digits


def generate_referral_code(length: int = 8) -> str:
    """Génère un code de parrainage unique — lettres majuscules + chiffres, URL-safe."""
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
    return create_jwt(
        payload,
        expires_delta=timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS),
    )


def decode_jwt(token: str) -> dict:
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
    )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'authentification manquant",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_jwt(credentials.credentials)
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
