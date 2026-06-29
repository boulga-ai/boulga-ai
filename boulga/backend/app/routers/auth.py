"""Router d'authentification.

Endpoints :
  POST /api/auth/register         — créer un compte
  POST /api/auth/login            — se connecter (JWT en cookie httpOnly)
  GET  /api/auth/me               — profil de l'utilisateur connecté
  POST /api/auth/logout           — déconnexion (supprime les cookies)
  POST /api/auth/refresh          — renouveler l'access token via le refresh token
  POST /api/auth/forgot-password  — envoyer un email de réinitialisation
  POST /api/auth/reset-password   — réinitialiser le mot de passe
"""

from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.core.security import (
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    create_jwt,
    create_refresh_token,
    create_reset_token,
    decode_refresh_token,
    generate_referral_code,
    get_current_user,
    hash_password,
    verify_password,
    verify_reset_token,
)
from app.db.repositories.user_repository import UserRepository
from app.db.session import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Schémas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    date_of_birth: date
    referral_code: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)


# ── Cookie helpers ────────────────────────────────────────────────────────────

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.is_production,
        "samesite": settings.COOKIE_SAMESITE,
        "path": "/",
    }
    if settings.COOKIE_DOMAIN:
        cookie_kwargs["domain"] = settings.COOKIE_DOMAIN

    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        **cookie_kwargs,
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=settings.JWT_REFRESH_EXPIRE_DAYS * 86400,
        **cookie_kwargs,
    )


def _clear_auth_cookies(response: Response) -> None:
    cookie_kwargs = {"path": "/", "httponly": True}
    if settings.COOKIE_DOMAIN:
        cookie_kwargs["domain"] = settings.COOKIE_DOMAIN
    response.delete_cookie(key=ACCESS_COOKIE, **cookie_kwargs)
    response.delete_cookie(key=REFRESH_COOKIE, **cookie_kwargs)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, response: Response):
    db = get_supabase()
    repo = UserRepository(db)

    if repo.get_by_email(req.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email déjà utilisé",
        )

    user_id = str(uuid4())
    user = repo.create({
        "id": user_id,
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "date_of_birth": req.date_of_birth.isoformat(),
        "referral_code": generate_referral_code(),
    })

    if req.referral_code:
        try:
            from app.services.referral_service import ReferralService
            ReferralService().register_with_referral(user["id"], req.referral_code)
        except Exception:
            pass

    jwt_payload = {"sub": user["id"], "email": user["email"], "is_admin": bool(user.get("is_admin", False))}
    access_token = create_jwt(jwt_payload)
    refresh_token = create_refresh_token(jwt_payload)

    _set_auth_cookies(response, access_token, refresh_token)

    return {"user": _safe_user(user)}


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    db = get_supabase()
    repo = UserRepository(db)

    user = repo.get_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    jwt_payload = {"sub": user["id"], "email": user["email"], "is_admin": bool(user.get("is_admin", False))}
    access_token = create_jwt(jwt_payload)
    refresh_token = create_refresh_token(jwt_payload)

    _set_auth_cookies(response, access_token, refresh_token)

    return {"user": _safe_user(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    db = get_supabase()
    repo = UserRepository(db)
    user_data = repo.get_by_id(user["sub"])
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable",
        )
    return _safe_user(user_data)


@router.post("/logout")
async def logout(response: Response):
    _clear_auth_cookies(response)
    return {"message": "Déconnecté avec succès"}


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token manquant",
        )
    try:
        payload = decode_refresh_token(token)
    except Exception:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide ou expiré",
        )

    db = get_supabase()
    repo = UserRepository(db)
    user = repo.get_by_id(payload["sub"])
    if not user:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable",
        )

    jwt_payload = {"sub": user["id"], "email": user["email"], "is_admin": bool(user.get("is_admin", False))}
    new_access = create_jwt(jwt_payload)
    new_refresh = create_refresh_token(jwt_payload)
    _set_auth_cookies(response, new_access, new_refresh)

    return {"user": _safe_user(user)}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    db = get_supabase()
    repo = UserRepository(db)
    user = repo.get_by_email(req.email)

    if not user:
        return {"message": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."}

    reset_token = create_reset_token(req.email)
    reset_link = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"

    try:
        from app.services.email_service import send_reset_password_email
        send_reset_password_email(req.email, user.get("name", ""), reset_link)
    except Exception:
        pass

    return {"message": "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé."}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    email = verify_reset_token(req.token)

    db = get_supabase()
    repo = UserRepository(db)
    user = repo.get_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable",
        )

    repo.update(user["id"], {"password_hash": hash_password(req.password)})
    return {"message": "Mot de passe réinitialisé avec succès"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_user(user: dict) -> dict:
    return {k: v for k, v in user.items() if k != "password_hash"}
