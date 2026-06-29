from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # LLM
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    JWT_SECRET: str = "change_me_in_production"
    JWT_REFRESH_SECRET: str = "change_me_refresh_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 30

    # Cookie
    COOKIE_DOMAIN: str = ""
    COOKIE_SAMESITE: str = "lax"

    # Resend
    RESEND_API_KEY: str = ""

    # CinetPay
    CINETPAY_API_KEY: str = ""
    CINETPAY_SITE_ID: str = ""
    CINETPAY_SECRET: str = ""

    # WhatsApp
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = ""
    META_APP_SECRET: str = ""

    # Cron
    CRON_SECRET: str = ""

    # Application
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL:  str = "http://localhost:8000"
    APP_ENV: str = "development"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
