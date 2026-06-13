"""
Gemini-powered template analysis via google-genai SDK.
Extracts structured metadata from COMPANY.md + agents/*.md + skills/*.md content.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

CATEGORIES = ["Marketing", "SaaS", "E-commerce", "Agency", "Media", "Finance", "Other"]


# ── Output schema ─────────────────────────────────────────────────────────────

class AgentInfo(BaseModel):
    id: str = Field(description="Unique slug id (lowercase, hyphens)")
    name: str = Field(description="Display name")
    role: str = Field(description="One-line role description")
    tier: str = Field(description="One of: Leadership, Operations, Execution")
    model: str = Field(default="claude-sonnet-4-6")
    schedule: Optional[str] = Field(default=None)
    parent: Optional[str] = Field(default=None)
    responsibilities: list[str] = Field(default_factory=list)


class SkillInfo(BaseModel):
    id: str
    name: str
    description: str


class TemplateAnalysis(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    time_to_first_output: Optional[str] = None
    agent_count: Optional[int] = None
    monthly_cost: Optional[float] = None
    monthly_revenue_min: Optional[float] = None
    agents: list[AgentInfo] = Field(default_factory=list)
    skills: list[SkillInfo] = Field(default_factory=list)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_files(files: dict[str, str]) -> str:
    if not files:
        return "(none)"
    return "\n\n".join(f"--- {name} ---\n{content}" for name, content in files.items())


def _build_prompt(company_md: str, agent_files: dict[str, str], skill_files: dict[str, str]) -> str:
    agent_names = list(agent_files.keys())
    skill_names = list(skill_files.keys())

    return f"""You are extracting structured metadata from AI-agent template source files.
Return ONLY a single valid JSON object — no prose, no markdown fences, no explanation.

## COMPANY.md
{company_md or "(not provided)"}

## AGENT FILES ({len(agent_names)} agents: {', '.join(agent_names) or 'none'})
{_fmt_files(agent_files)}

## SKILL FILES ({len(skill_names)} skills: {', '.join(skill_names) or 'none'})
{_fmt_files(skill_files)}

## Extraction rules

**Template-level fields (from COMPANY.md)**
- `category`: one of {', '.join(CATEGORIES)}
- `tags`: 3-6 lowercase kebab-case strings
- `goals`: 2-5 concrete outcomes starting with a verb
- `monthly_cost` / `monthly_revenue_min`: plain USD numbers, null if unknown
- `time_to_first_output`: e.g. "<5 min", "~1h", null if unknown

**`agents` — create EXACTLY {len(agent_names)} entries, one per agent file above**
For each agent file:
- `id`: the agent key shown above (e.g. "audit-trail-agent")
- `name`: from `name:` or `title:` frontmatter field
- `role`: from `role:` or `title:` frontmatter; summarise from body if absent
- `tier`: from `tier:` frontmatter; infer if missing — CEO/CTO/VP/Director → Leadership; Manager/Lead/Coordinator → Operations; others → Execution
- `model`: from `model:` frontmatter; OR extract from HTML comment `<!-- adapter: ... | model: VALUE -->` at end of file; default "claude-sonnet-4-6"
- `schedule`: from `schedule:` or `triggers:` frontmatter; OR first line of "## What triggers you" body section; null if absent
- `parent`: from `parent:` or `reportsTo:` frontmatter; null if absent or "null"
- `responsibilities`: from `responsibilities:` frontmatter list; OR bullet items from "## What you do" body section; [] if absent

**`skills` — create EXACTLY {len(skill_names)} entries, one per skill file above**
- `id`: the skill key shown above
- `name`: from `name:` frontmatter
- `description`: from `description:` frontmatter or first body line

## Required JSON shape
{{
  "title": string or null,
  "description": string or null,
  "category": string or null,
  "tags": [string],
  "goals": [string],
  "time_to_first_output": string or null,
  "agent_count": integer or null,
  "monthly_cost": number or null,
  "monthly_revenue_min": number or null,
  "agents": [
    {{
      "id": string,
      "name": string,
      "role": string,
      "tier": string,
      "model": string,
      "schedule": string or null,
      "parent": string or null,
      "responsibilities": [string]
    }}
  ],
  "skills": [
    {{
      "id": string,
      "name": string,
      "description": string
    }}
  ]
}}"""


# ── Service function ──────────────────────────────────────────────────────────

async def analyze_template(
    company_md: str,
    agent_files: dict[str, str],
    skill_files: dict[str, str],
) -> TemplateAnalysis:
    """Call Gemini and return extracted TemplateAnalysis."""
    client = genai.Client(api_key=settings.gemini_api_key)
    prompt = _build_prompt(company_md, agent_files, skill_files)

    logger.debug("Gemini prompt length: %d chars, agents: %s, skills: %s",
                 len(prompt), list(agent_files.keys()), list(skill_files.keys()))

    response = await client.aio.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
        ),
    )

    raw = response.text.strip()
    # Strip accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    logger.debug("Gemini raw response: %s", raw[:500])

    data = json.loads(raw)
    result = TemplateAnalysis.model_validate(data)

    # Normalise category
    if result.category and result.category not in CATEGORIES:
        result.category = "Other"

    # Ensure agent count matches actual agents extracted
    if result.agents:
        result.agent_count = len(result.agents)
    elif result.agent_count is None:
        result.agent_count = len(agent_files) or None

    return result
