"""code_executor.py — Exécution sécurisée du code Python généré par un LLM.

TODO (sécurité production) : le blocage par regex des modules dangereux est insuffisant.
En production, utiliser un vrai sandbox isolé : E2B (https://e2b.dev), un conteneur Docker
dédié sans accès réseau, ou un outil équivalent. Ne pas déployer le sandbox actuel
sur un endpoint public sans isolation supplémentaire.
"""

import asyncio
import mimetypes
import os
import re
import tempfile
from pathlib import Path
from typing import AsyncGenerator

# Modules dangereux interdits
_BLOCKED = re.compile(
    r"\b(socket|subprocess|multiprocessing|pty|ctypes|"
    r"importlib|pickle|shelve|ftplib|smtplib|"
    r"urllib\.request|httpx|requests|aiohttp)\b"
)

_ALLOWED_EXT = {".docx", ".xlsx", ".xls", ".pdf", ".pptx", ".csv", ".txt"}
_MAX_SIZE = 20 * 1024 * 1024  # 20 MB


class CodeExecutionError(Exception):
    pass


class CodeExecutor:
    async def execute(
        self,
        code: str,
        timeout: float = 30.0,
    ) -> list[dict]:
        """
        Exécute du code Python dans un répertoire temporaire isolé.
        Retourne la liste des fichiers produits : [{"filename", "content", "mime_type"}]
        """
        # Sécurité : bloquer les modules dangereux
        if _BLOCKED.search(code):
            raise CodeExecutionError("Code refusé : module interdit détecté")

        with tempfile.TemporaryDirectory(prefix="boulga_exec_") as tmpdir:
            # Injecter chdir en tête pour que les fichiers soient créés dans tmpdir
            safe_code = f"import os\nos.chdir({tmpdir!r})\n\n{code}"

            # Écrire le code dans un fichier temporaire
            script_path = os.path.join(tmpdir, "_script.py")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(safe_code)

            try:
                proc = await asyncio.create_subprocess_exec(
                    "python3", script_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=tmpdir,
                )
                try:
                    stdout, stderr = await asyncio.wait_for(
                        proc.communicate(), timeout=timeout
                    )
                except asyncio.TimeoutError:
                    proc.kill()
                    await proc.communicate()
                    raise CodeExecutionError(f"Timeout dépassé ({timeout}s)")

                if proc.returncode != 0:
                    err = stderr.decode("utf-8", errors="replace")[:500]
                    raise CodeExecutionError(f"Erreur d'exécution : {err}")

            except CodeExecutionError:
                raise
            except Exception as exc:
                raise CodeExecutionError(f"Erreur subprocess : {exc}") from exc

            # Scanner les fichiers produits (exclure le script lui-même)
            produced = []
            for entry in Path(tmpdir).iterdir():
                if entry.name == "_script.py":
                    continue
                if entry.suffix.lower() not in _ALLOWED_EXT:
                    continue
                if entry.stat().st_size > _MAX_SIZE:
                    continue
                content = entry.read_bytes()
                mime_type, _ = mimetypes.guess_type(entry.name)
                mime_type = mime_type or "application/octet-stream"
                produced.append({
                    "filename": entry.name,
                    "content": content,
                    "mime_type": mime_type,
                })

            return produced

    async def execute_streaming(
        self,
        code: str,
        timeout: float = 90.0,
    ) -> AsyncGenerator[dict, None]:
        """
        Variante streaming de execute() : lit stdout ligne par ligne en temps réel.
        Yield :
          {"type": "log",   "line":  str}          — chaque ligne stdout/stderr
          {"type": "done",  "files": list[dict]}   — fichiers produits (fin normale)
          {"type": "error", "message": str}         — erreur (fin anormale)
        """
        if _BLOCKED.search(code):
            yield {"type": "error", "message": "Code refusé : module interdit détecté"}
            return

        with tempfile.TemporaryDirectory(prefix="boulga_exec_") as tmpdir:
            safe_code = f"import os\nos.chdir({tmpdir!r})\n\n{code}"
            script_path = os.path.join(tmpdir, "_script.py")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(safe_code)

            # Accumulation de la sortie pour le contexte d'erreur (boucle de correction)
            accumulated: list[str] = []

            try:
                proc = await asyncio.create_subprocess_exec(
                    "python3", script_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,  # fusionner stderr → stdout
                    cwd=tmpdir,
                )

                loop = asyncio.get_event_loop()
                deadline = loop.time() + timeout

                while True:
                    remaining = deadline - loop.time()
                    if remaining <= 0:
                        proc.kill()
                        await proc.communicate()
                        yield {"type": "error", "message": f"Timeout dépassé ({timeout}s)\n" + "\n".join(accumulated[-20:])}
                        return
                    try:
                        line = await asyncio.wait_for(
                            proc.stdout.readline(), timeout=remaining
                        )
                    except asyncio.TimeoutError:
                        proc.kill()
                        await proc.communicate()
                        yield {"type": "error", "message": f"Timeout dépassé ({timeout}s)\n" + "\n".join(accumulated[-20:])}
                        return
                    if not line:
                        break
                    decoded = line.decode("utf-8", errors="replace").rstrip()
                    if decoded:
                        accumulated.append(decoded)
                        yield {"type": "log", "line": decoded}

                await proc.wait()
                if proc.returncode != 0:
                    yield {
                        "type": "error",
                        "message": "\n".join(accumulated[-50:]) or "Erreur d'exécution (pas de sortie)",
                    }
                    return

            except Exception as exc:
                yield {"type": "error", "message": f"Erreur subprocess : {exc}\n" + "\n".join(accumulated[-20:])}
                return

            # Scanner les fichiers produits
            produced = []
            for entry in Path(tmpdir).iterdir():
                if entry.name == "_script.py":
                    continue
                if entry.suffix.lower() not in _ALLOWED_EXT:
                    continue
                if entry.stat().st_size > _MAX_SIZE:
                    continue
                content = entry.read_bytes()
                mime_type, _ = mimetypes.guess_type(entry.name)
                mime_type = mime_type or "application/octet-stream"
                produced.append({
                    "filename": entry.name,
                    "content":  content,
                    "mime_type": mime_type,
                })

            yield {"type": "done", "files": produced}
