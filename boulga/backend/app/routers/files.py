from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.core.exceptions import NotFoundError
from app.core.security import get_current_user
from app.services.file_service import FileService

router = APIRouter()

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


@router.get("/api/files")
async def list_files(user: dict = Depends(get_current_user)):
    """
    Liste les fichiers uploadés par l'utilisateur connecté.
    Retourne id, original_name, mime_type, size_bytes, created_at — triés par date.
    """
    svc = FileService()
    records = svc.list_for_user(user["sub"])
    return [
        {
            "id": r["id"],
            "original_name": r["original_name"],
            "mime_type": r["mime_type"],
            "size_bytes": r["size_bytes"],
            "created_at": r["created_at"],
        }
        for r in records
    ]


@router.post("/api/files/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Upload un fichier (multipart/form-data).
    Stocke dans Supabase Storage + enregistrement en base.
    Limite : 50 MB. Retourne { id, original_name, mime_type, size_bytes }.
    """
    content = await file.read()

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Fichier trop volumineux. La limite est de 50 MB.",
        )

    if not content:
        raise HTTPException(status_code=400, detail="Fichier vide.")

    svc = FileService()
    try:
        record = svc.store_file(
            user_id=user["sub"],
            filename=file.filename or "upload",
            content=content,
            mime_type=file.content_type or "application/octet-stream",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "id": record["id"],
        "original_name": record["original_name"],
        "mime_type": record["mime_type"],
        "size_bytes": record["size_bytes"],
    }


@router.get("/api/files/{file_id}/download")
async def download_file(
    file_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Télécharge un fichier depuis Supabase Storage.
    Retourne le fichier binaire avec le bon Content-Type.
    404 si le fichier est introuvable ou n'appartient pas à l'utilisateur.
    """
    svc = FileService()
    meta = svc.get_meta(file_id)

    if not meta or meta.get("user_id") != user["sub"]:
        raise NotFoundError("Fichier introuvable")

    content = svc.download_content(meta["storage_path"])

    safe_name = meta["original_name"].replace('"', '\\"')
    return Response(
        content=content,
        media_type=meta.get("mime_type", "application/octet-stream"),
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Content-Length": str(len(content)),
        },
    )
