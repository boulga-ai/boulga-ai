import asyncio
import base64
import logging
from dataclasses import dataclass, field

from app.config import settings
from app.services.file_service import FileService

logger = logging.getLogger(__name__)


@dataclass
class CodeResult:
    stdout: str = ""
    stderr: str = ""
    files: list[dict] = field(default_factory=list)
    error: str | None = None


class CodeExecutionService:
    def __init__(self) -> None:
        self._file_svc = FileService()

    async def execute(
        self,
        code: str,
        user_id: str,
        conversation_id: str | None = None,
        message_id: str | None = None,
        timeout: int = 300,
    ) -> CodeResult:
        """
        Exécute du code Python dans une sandbox E2B isolée.

        Le code signale les fichiers générés via stdout :
            print("FILE:/home/user/rapport.xlsx")

        Les fichiers sont téléchargés depuis la sandbox, uploadés sur
        Supabase et retournés avec une URL signée.
        """
        try:
            from e2b_code_interpreter import Sandbox
        except ImportError:
            return CodeResult(error="e2b-code-interpreter non installé")

        if not settings.E2B_API_KEY:
            return CodeResult(error="E2B_API_KEY manquante dans .env")

        return await asyncio.to_thread(
            self._execute_sync, Sandbox, code, user_id, conversation_id, message_id, timeout
        )

    def _execute_sync(
        self,
        Sandbox,
        code: str,
        user_id: str,
        conversation_id: str | None,
        message_id: str | None,
        timeout: int,
    ) -> CodeResult:
        sbx = None
        try:
            sbx = Sandbox.create(timeout=timeout, api_key=settings.E2B_API_KEY)
            execution = sbx.run_code(code, timeout=float(timeout))

            stdout_lines: list[str] = []
            for _l in (execution.logs.stdout or []):
                stdout_lines.extend(str(_l).splitlines())
            stderr_lines: list[str] = []
            for _l in (execution.logs.stderr or []):
                stderr_lines.extend(str(_l).splitlines())

            result = CodeResult(
                stdout="\n".join(stdout_lines),
                stderr="\n".join(stderr_lines),
            )

            # Fichiers signalés via "FILE:/chemin"
            generated_paths = [
                line[5:].strip()
                for line in stdout_lines
                if line.startswith("FILE:")
            ]

            for path in generated_paths:
                try:
                    _raw = sbx.files.read(path, format="bytes")
                    content: bytes = bytes(_raw) if isinstance(_raw, (bytearray, memoryview)) else _raw
                    filename = path.split("/")[-1]
                    mime_type = _mime_for(filename)

                    record = self._file_svc.store_generated_file(
                        user_id=user_id,
                        filename=filename,
                        content=content,
                        mime_type=mime_type,
                        conversation_id=conversation_id,
                        message_id=message_id,
                    )

                    result.files.append({
                        "name": filename,
                        "signed_url": record.get("signed_url"),
                        "mime_type": mime_type,
                        "size_bytes": len(content),
                        "file_id": record.get("id"),
                    })
                    logger.info("E2B fichier uploadé : %s (%d octets)", filename, len(content))

                except Exception as exc:
                    logger.warning("E2B impossible de récupérer %s : %s", path, exc)
                    result.stderr += f"\n[Erreur récupération {path} : {exc}]"

            # Images matplotlib / rich outputs
            for i, output in enumerate(execution.results or []):
                if hasattr(output, "png") and output.png:
                    try:
                        content = base64.b64decode(output.png)
                        filename = f"graphique_{i + 1}.png"

                        record = self._file_svc.store_generated_file(
                            user_id=user_id,
                            filename=filename,
                            content=content,
                            mime_type="image/png",
                            conversation_id=conversation_id,
                            message_id=message_id,
                        )

                        result.files.append({
                            "name": filename,
                            "signed_url": record.get("signed_url"),
                            "mime_type": "image/png",
                            "size_bytes": len(content),
                            "file_id": record.get("id"),
                        })
                    except Exception as exc:
                        logger.warning("E2B graphique %d non uploadé : %s", i, exc)

            return result

        except Exception as exc:
            logger.exception("Erreur sandbox E2B")
            return CodeResult(error=str(exc))

        finally:
            if sbx is not None:
                try:
                    sbx.kill()
                except Exception:
                    pass


_MIME_MAP = {
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "pdf": "application/pdf",
    "csv": "text/csv",
    "txt": "text/plain",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "json": "application/json",
    "zip": "application/zip",
}


def _mime_for(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _MIME_MAP.get(ext, "application/octet-stream")
