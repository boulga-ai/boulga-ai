"""Router d'authentification.

Endpoints :
  POST /api/auth/register   — créer un compte
  POST /api/auth/login      — se connecter (renvoie JWT)
  GET  /api/auth/me         — profil de l'utilisateur connecté
  POST /api/auth/logout     — déconnexion
"""

from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.security import (
    create_jwt,
    generate_referral_code,
    get_current_user,
    hash_password,
    verify_password,
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


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest):
    """Créer un nouveau compte utilisateur."""
    db = get_supabase()
    repo = UserRepository(db)

    # Vérifier l'unicité de l'email
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

    # Enregistrer le parrainage (best-effort — n'empêche pas l'inscription)
    if req.referral_code:
        try:
            from app.services.referral_service import ReferralService
            ReferralService().register_with_referral(user["id"], req.referral_code)
        except Exception:
            pass

    token = create_jwt({"sub": user["id"], "email": user["email"], "is_admin": bool(user.get("is_admin", False))})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _safe_user(user),
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Se connecter avec email + mot de passe. Renvoie un JWT."""
    db = get_supabase()
    repo = UserRepository(db)

    user = repo.get_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    token = create_jwt({"sub": user["id"], "email": user["email"], "is_admin": bool(user.get("is_admin", False))})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _safe_user(user),
    }


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
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
async def logout():
    """Déconnexion. Le client doit supprimer le token côté frontend."""
    return {"message": "Déconnecté avec succès"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_user(user: dict) -> dict:
    """Retourne le profil sans le hash du mot de passe."""
    return {k: v for k, v in user.items() if k != "password_hash"}
