from __future__ import annotations

import json
import os
from typing import Any, List, Optional

import httpx

from .models import AnalysisResponse


def groq_reasoning_points(analysis: AnalysisResponse) -> Optional[List[str]]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    prompt = {
        "task": "Generate short, explainable reasoning points for why the top career matches were chosen.",
        "constraints": [
            "Return ONLY JSON: {\"reasoning_points\": [..strings..]}",
            "Max 6 points",
            "Each point max 16 words",
            "No markdown",
        ],
        "input": analysis.model_dump(),
    }

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": "You output strict JSON only."},
                        {"role": "user", "content": json.dumps(prompt)},
                    ],
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]

        parsed = json.loads(content)
        pts = parsed.get("reasoning_points")
        if isinstance(pts, list) and all(isinstance(x, str) for x in pts):
            return pts[:6]
        return None
    except Exception:
        return None


def _groq_json(prompt: dict[str, Any]) -> Optional[dict[str, Any]]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": "You output strict JSON only."},
                        {"role": "user", "content": json.dumps(prompt)},
                    ],
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        if isinstance(parsed, dict):
            return parsed
        return None
    except Exception:
        return None


def groq_roadmap_narrative(*, profile: dict[str, Any], roadmap: dict[str, Any]) -> Optional[str]:
    parsed = _groq_json(
        {
            "task": "Write a short roadmap narrative summary for the user.",
            "constraints": [
                "Return ONLY JSON: {\"narrative\": \"...\"}",
                "Max 120 words",
                "No markdown",
                "Use 2 short paragraphs",
            ],
            "input": {"profile": profile, "roadmap": roadmap},
        }
    )
    if not parsed:
        return None
    narrative = parsed.get("narrative")
    return narrative if isinstance(narrative, str) and narrative.strip() else None


def groq_swot_narrative(*, profile: dict[str, Any], career_profile: dict[str, Any]) -> Optional[str]:
    parsed = _groq_json(
        {
            "task": "Write a short SWOT narrative for the user for this career target.",
            "constraints": [
                "Return ONLY JSON: {\"narrative\": \"...\"}",
                "Max 120 words",
                "No markdown",
                "Make it actionable and specific",
                "The narrative MUST be written for the career in career_profile.career_title (ignore profile.goal if different)",
            ],
            "input": {"profile": profile, "career_profile": career_profile},
        }
    )
    if not parsed:
        return None
    narrative = parsed.get("narrative")
    return narrative if isinstance(narrative, str) and narrative.strip() else None
