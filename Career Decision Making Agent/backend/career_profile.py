from __future__ import annotations

from .agent import CAREERS
from .models import CareerProfileResponse, CareerProfileStats, Explainability, ProfileInput
from .llm import groq_swot_narrative
from .swot_generator import generate_swot, swot_explainability


def _career_by_id(career_id: str):
    for c in CAREERS:
        if c.id == career_id:
            return c
    return None


def get_career_profile(profile: ProfileInput, career_id: str) -> CareerProfileResponse:
    career = _career_by_id(career_id)
    if career is None:
        raise ValueError("Unknown career_id")

    # Simple deterministic salary bands (relative), you can swap to real datasets later
    base_salary = int(80000 + (career.salary * 700))  # rough scale
    salary_low = int(base_salary * 0.8)
    salary_high = int(base_salary * 1.2)

    swot = generate_swot(profile, career_id)

    stats = CareerProfileStats(
        growth_rate=float(career.growth),
        salary_low=salary_low,
        salary_high=salary_high,
        automation_risk=float(career.automation_risk),
        stability=float(career.stability),
    )

    explain = swot_explainability(profile, career_id)
    explain.notes = (explain.notes or "") + " Stats are deterministic placeholders; replace with real market data later."

    cp = CareerProfileResponse(
        career_id=career.id,
        career_title=career.title,
        swot=swot,
        stats=stats,
        explainability=explain,
    )

    narrative = groq_swot_narrative(profile=profile.model_dump(), career_profile=cp.model_dump())
    if narrative:
        cp = cp.model_copy(update={"narrative": narrative})

    return cp
