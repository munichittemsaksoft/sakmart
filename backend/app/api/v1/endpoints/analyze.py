import io
import logging
import re
import traceback
import zipfile

from fastapi import APIRouter, File, HTTPException, UploadFile
from app.services.ai_service import analyze_template, TemplateAnalysis
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analyze", tags=["analyze"])


def _read_zip(data: bytes) -> tuple[str, dict[str, str], dict[str, str]]:
    """Extract COMPANY.md, agent files and skill files from zip bytes.

    Supports both flat and subfolder layouts:
      Flat:      agents/ceo.md              → key "ceo"
      Subfolder: agents/ceo/ceo.md          → key "ceo"  (folder name wins)
    Same rule applies to skills/.
    """
    company_md = ""
    agent_files: dict[str, str] = {}
    skill_files: dict[str, str] = {}

    # Patterns: group(1) = folder/file id
    AGENT_SUB  = re.compile(r"(?:^|/)agents/([^/]+)/[^/]+\.md$", re.IGNORECASE)
    AGENT_FLAT = re.compile(r"(?:^|/)agents/([^/]+)\.md$",       re.IGNORECASE)
    SKILL_SUB  = re.compile(r"(?:^|/)skills/([^/]+)/[^/]+\.md$", re.IGNORECASE)
    SKILL_FLAT = re.compile(r"(?:^|/)skills/([^/]+)\.md$",       re.IGNORECASE)

    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for entry in zf.infolist():
            if entry.is_dir():
                continue
            norm = entry.filename.replace("\\", "/").lstrip("/")
            if "__MACOSX/" in norm or ".DS_Store" in norm:
                continue
            try:
                text = zf.read(entry.filename).decode("utf-8")
            except (UnicodeDecodeError, Exception):
                continue

            basename = norm.rsplit("/", 1)[-1]

            if basename == "COMPANY.md":
                company_md = text
            elif m := AGENT_SUB.search(norm):
                agent_files[m.group(1)] = text        # folder name as key
            elif m := AGENT_FLAT.search(norm):
                agent_files[m.group(1)] = text        # filename (no ext) as key
            elif m := SKILL_SUB.search(norm):
                skill_files[m.group(1)] = text
            elif m := SKILL_FLAT.search(norm):
                skill_files[m.group(1)] = text

    return company_md, agent_files, skill_files


@router.post("", response_model=TemplateAnalysis)
async def analyze(file: UploadFile = File(...)):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="AI analysis not configured — set GEMINI_API_KEY in .env")

    data = await file.read()
    try:
        company_md, agent_files, skill_files = _read_zip(data)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid ZIP")

    logger.info(
        "Analyzing zip: COMPANY.md=%s, agents=%d, skills=%d",
        bool(company_md), len(agent_files), len(skill_files),
    )

    try:
        return await analyze_template(
            company_md=company_md,
            agent_files=agent_files,
            skill_files=skill_files,
        )
    except Exception as e:
        logger.error("AI analysis failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {type(e).__name__}: {e}")
