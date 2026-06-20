from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class BoulgaError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "BOULGA_ERROR",
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


class NotFoundError(BoulgaError):
    def __init__(self, message: str = "Ressource introuvable"):
        super().__init__(message, status_code=404, code="NOT_FOUND")


class UnauthorizedError(BoulgaError):
    def __init__(self, message: str = "Non autorisé"):
        super().__init__(message, status_code=401, code="UNAUTHORIZED")


class ForbiddenError(BoulgaError):
    def __init__(self, message: str = "Accès refusé"):
        super().__init__(message, status_code=403, code="FORBIDDEN")


class QuotaExceededError(BoulgaError):
    def __init__(self, message: str = "Quota dépassé"):
        super().__init__(message, status_code=429, code="QUOTA_EXCEEDED")


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(BoulgaError)
    async def boulga_error_handler(request: Request, exc: BoulgaError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.code, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "message": "Une erreur interne est survenue",
            },
        )
