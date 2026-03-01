from __future__ import annotations

from typing import List

from .agent import CAREERS
from .skill_utils import expand_user_skills
from .models import Explainability, ProfileInput, SWOT


def _normalize(items: List[str]) -> List[str]:
    return [x.strip().lower() for x in items if x and x.strip()]


def _career_by_id(career_id: str):
    for c in CAREERS:
        if c.id == career_id:
            return c
    return None


def generate_swot(profile: ProfileInput, career_id: str) -> SWOT:
    career = _career_by_id(career_id)
    if career is None:
        raise ValueError("Unknown career_id")

    user_skills = set(expand_user_skills(profile.skills))
    required = _normalize(career.required_skills)
    have = [s for s in required if s in user_skills]
    missing = [s for s in required if s not in user_skills]

    strengths = []
    weaknesses = []

    if have:
        strengths.append(f"You already have: {', '.join(have[:4])}.")
    strengths.append(f"Your experience level is {profile.experience_level}, which helps planning and execution.")

    if missing:
        weaknesses.append(f"Key gaps: {', '.join(missing[:5])}.")
    weaknesses.append("Portfolio depth may be limited until you build 1–2 end-to-end projects.")

    opportunities = [
        "High demand for practical projects and deployment skills.",
        "Open-source + blogging can accelerate credibility.",
        "Internships/remote projects can substitute for formal experience.",
    ]

    if profile.experience_level == "Beginner":
        opportunities.append("Beginner-friendly internships available.")

    threats = [
        "Rapid tool changes require continuous learning.",
        "Competition is high; weak portfolio makes filtering harder.",
        "Automation can reduce low-skill roles; specialization matters.",
    ]

    return SWOT(
        strengths=strengths,
        weaknesses=weaknesses,
        opportunities=opportunities,
        threats=threats,
    )


def swot_explainability(profile: ProfileInput, career_id: str) -> Explainability:
    return Explainability(
        weighted_factors={"skills_to_required": 1.0},
        reasoning_points=[
            "Strengths/weaknesses are derived from overlap between your skills and career required skills.",
            "Opportunities/threats are based on typical market dynamics for the role.",
        ],
        decision_trace={"risk_tolerance": float(profile.risk_tolerance), "salary_preference": float(profile.salary_preference)},
        notes=f"SWOT generated for {career_id} using your profile context.",
    )
