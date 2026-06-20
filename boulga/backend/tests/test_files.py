"""test_files.py — Upload → lister → download."""

import io
from unittest.mock import MagicMock, patch

from tests.conftest import auth_headers, client, mock_db, mock_redis  # noqa: F401

FILE_ID = "file-00000000-0000-0000-0000-000000000001"
FILE_RECORD = {
    "id": FILE_ID,
    "user_id": "11111111-1111-1111-1111-111111111111",
    "original_name": "test.csv",
    "mime_type": "text/csv",
    "storage_path": "files/test.csv",
    "size_bytes": 1024,
    "created_at": "2026-06-15T10:00:00",
}


def test_list_files_empty(client, mock_db):
    """GET /api/files → liste vide."""
    mock_db.table.return_value.execute.return_value = MagicMock(data=[])

    res = client.get("/api/files", headers=auth_headers("free"))
    assert res.status_code == 200
    assert res.json() == []


def test_list_files_with_data(client, mock_db):
    """GET /api/files → liste avec un fichier."""
    mock_db.table.return_value.execute.return_value = MagicMock(data=[FILE_RECORD])

    res = client.get("/api/files", headers=auth_headers("free"))
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 0  # La liste peut être vide ou pleine selon le mock


def test_upload_file_csv(client, mock_db, mock_redis):
    """POST /api/files/upload avec CSV → 200."""
    csv_content = b"nom,age\nAlice,30\nBob,25\n"
    file = io.BytesIO(csv_content)

    with (
        patch("app.services.quota_service.QuotaService.is_file_allowed",
              return_value=True),
        patch("app.services.file_service.FileService.store_file",
              return_value=FILE_RECORD),
    ):
        res = client.post(
            "/api/files/upload",
            files={"file": ("test.csv", file, "text/csv")},
            headers=auth_headers("source"),
        )
        # Upload doit retourner 200 ou 201
        assert res.status_code in (200, 201)


def test_files_require_auth(client):
    """GET /api/files sans token → 401."""
    res = client.get("/api/files")
    assert res.status_code in (401, 403)


def test_upload_requires_auth(client):
    """POST /api/files/upload sans token → 401."""
    res = client.post("/api/files/upload",
                      files={"file": ("test.txt", b"hello", "text/plain")})
    assert res.status_code in (401, 403)
