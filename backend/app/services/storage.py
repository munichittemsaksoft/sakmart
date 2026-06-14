"""
Storage service with pluggable backend.
Switch between local filesystem and Azure Blob Storage via STORAGE_BACKEND env var.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from abc import ABC, abstractmethod

from app.core.config import settings


class StorageBackend(ABC):
    @abstractmethod
    async def upload(self, file_bytes: bytes, filename: str, content_type: str | None = None) -> tuple[str, str]:
        """Returns (storage_key, public_url)"""

    @abstractmethod
    async def delete(self, storage_key: str) -> None:
        pass

    @abstractmethod
    def public_url(self, storage_key: str) -> str:
        pass

    def download_url(self, storage_key: str, filename: str = "download") -> str:
        """Returns a URL that triggers a file download. Override in subclasses for signed URLs."""
        return self.public_url(storage_key)


# ─── Local ───────────────────────────────────────────────────────

class LocalStorage(StorageBackend):
    def __init__(self):
        self.base_dir = Path(settings.local_upload_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def upload(self, file_bytes: bytes, filename: str, content_type: str | None = None) -> tuple[str, str]:
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        dest = self.base_dir / unique_name
        dest.write_bytes(file_bytes)
        return unique_name, self.public_url(unique_name)

    async def delete(self, storage_key: str) -> None:
        path = self.base_dir / storage_key
        if path.exists():
            path.unlink()

    def public_url(self, storage_key: str) -> str:
        base = settings.local_base_url.rstrip("/")
        return f"{base}/{storage_key}"


# ─── Azure Blob Storage ───────────────────────────────────────────

class AzureStorage(StorageBackend):
    def __init__(self):
        from azure.storage.blob import BlobServiceClient
        self._conn_str = settings.azure_storage_connection_string
        self._client = BlobServiceClient.from_connection_string(self._conn_str)
        self._container = settings.azure_container_name
        # Create container without public access (private — downloads use SAS URLs)
        try:
            self._client.create_container(self._container)
        except Exception:
            pass  # already exists

    async def upload(self, file_bytes: bytes, filename: str, content_type: str | None = None) -> tuple[str, str]:
        from azure.storage.blob import ContentSettings
        ext = Path(filename).suffix
        blob_name = f"{uuid.uuid4().hex}{ext}"
        blob_client = self._client.get_blob_client(
            container=self._container, blob=blob_name
        )
        blob_client.upload_blob(
            file_bytes,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type or "application/octet-stream"),
        )
        return blob_name, self.public_url(blob_name)

    async def delete(self, storage_key: str) -> None:
        try:
            blob_client = self._client.get_blob_client(
                container=self._container, blob=storage_key
            )
            blob_client.delete_blob()
        except Exception:
            pass

    def public_url(self, storage_key: str) -> str:
        if settings.azure_cdn_base_url:
            base = settings.azure_cdn_base_url.rstrip("/")
            return f"{base}/{storage_key}"
        account = self._client.account_name
        return f"https://{account}.blob.core.windows.net/{self._container}/{storage_key}"

    def download_url(self, storage_key: str, filename: str = "download") -> str:
        """Generate a 1-hour SAS URL that forces a file download with the given filename."""
        from azure.storage.blob import generate_blob_sas, BlobSasPermissions

        # Extract account key from connection string
        parts = dict(
            seg.split("=", 1) for seg in self._conn_str.split(";") if "=" in seg
        )
        account_key = parts.get("AccountKey", "")

        sas_token = generate_blob_sas(
            account_name=self._client.account_name,
            container_name=self._container,
            blob_name=storage_key,
            account_key=account_key,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(hours=1),
            content_disposition=f'attachment; filename="{filename}"',
            content_type="application/zip",
        )
        account = self._client.account_name
        return (
            f"https://{account}.blob.core.windows.net"
            f"/{self._container}/{storage_key}?{sas_token}"
        )


# ─── Factory ─────────────────────────────────────────────────────

def get_storage() -> StorageBackend:
    if settings.storage_backend == "azure":
        return AzureStorage()
    return LocalStorage()


# Singleton
_storage: StorageBackend | None = None


def storage() -> StorageBackend:
    global _storage
    if _storage is None:
        _storage = get_storage()
    return _storage
