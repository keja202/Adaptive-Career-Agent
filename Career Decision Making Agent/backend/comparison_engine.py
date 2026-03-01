from __future__ import annotations

from typing import Dict, Tuple

from .agent import CAREERS
from .skill_utils import expand_user_skills
from .models import (
    ComparedCareer,
    ComparisonRequest,
    ComparisonResponse,
    Explainability,
    MatchBreakdown,
    ProfileInput,
    RadarMetrics,
)


def _career_by_id(career_id: str):
    for c in CAREERS:
        if c.id == career_id:
            return c
    return None


def _normalize(items: list[str]) -> list[str]:
    return [x.strip().lower() for x in items if x and x.strip()]


def _skill_match(required: list[str], user_skills: list[str]) -> Tuple[float, list[str]]:
    req = _normalize(required)
    user = set(_normalize(user_skills))
    hit = [s for s in req if s in user]
    missing = [s for s in req if s not in user]
    if not req:
        return 0.0, []
    return (len(hit) / len(req)) * 100.0, missing


def _risk_fit(risk_tolerance: int, automation_risk: float) -> float:
    preferred_max = 30 + (risk_tolerance * 0.6)
    delta = max(0.0, automation_risk - preferred_max)
    return max(0.0, 100.0 - (delta * 2.0))


def _salary_fit(salary_preference: int, salary_score: float) -> float:
    alpha = salary_preference / 100.0
    return (salary_score * alpha) + (60.0 * (1.0 - alpha))


def _score(profile: ProfileInput, career_id: str) -> ComparedCareer:
    c = _career_by_id(career_id)
    if c is None:
        raise ValueError("Unknown career_id")

    weights: Dict[str, float] = {
        "skills": 0.40,
        "growth": 0.20,
        "salary": 0.20,
        "stability": 0.10,
        "risk": 0.10,
    }

    user_skills = expand_user_skills(profile.skills)
    skill_match, missing = _skill_match(c.required_skills, user_skills)
    salary_fit = _salary_fit(profile.salary_preference, c.salary)
    risk_fit = _risk_fit(profile.risk_tolerance, c.automation_risk)

    components: Dict[str, float] = {
        "skills": skill_match,
        "growth": c.growth,
        "salary": salary_fit,
        "stability": c.stability,
        "risk": risk_fit,
    }

    score = sum(components[k] * weights[k] for k in weights)

    gap = 100.0 - skill_match
    exp_boost = {"Beginner": 0.0, "Intermediate": 6.0, "Advanced": 10.0}[profile.experience_level]
    feasibility = max(0.0, min(100.0, (100.0 - gap) + exp_boost))

    contributions = {k: round(components[k] * weights[k], 2) for k in weights}
    dominant_factor = max(contributions.items(), key=lambda kv: kv[1])[0]

    return ComparedCareer(
        id=c.id,
        title=c.title,
        breakdown=MatchBreakdown(
            match_percent=round(score, 1),
            skill_match_percent=round(skill_match, 1),
            salary_fit_percent=round(salary_fit, 1),
            growth_percent=round(c.growth, 1),
        ),
        radar=RadarMetrics(
            skill_match=round(skill_match, 1),
            growth=round(c.growth, 1),
            salary=round(c.salary, 1),
            stability=round(c.stability, 1),
            automation_risk=round(c.automation_risk, 1),
        ),
        feasibility=round(feasibility, 1),
        missing_skills=missing[:10],
        dominant_factor=dominant_factor,
        factor_contributions=contributions,
    )


def compare(req: ComparisonRequest) -> ComparisonResponse:
    a = _score(req.profile, req.career_a_id)
    b = _score(req.profile, req.career_b_id)

    score_delta = round((a.breakdown.match_percent - b.breakdown.match_percent), 1)

    factor_deltas: Dict[str, float] = {}
    for k in set(a.factor_contributions.keys()) | set(b.factor_contributions.keys()):
        factor_deltas[k] = round((a.factor_contributions.get(k, 0.0) - b.factor_contributions.get(k, 0.0)), 2)

    dominant_advantage_factor = max(factor_deltas.items(), key=lambda kv: abs(kv[1]))[0] if factor_deltas else "skills"

    explain = Explainability(
        weighted_factors={"score_delta": 1.0},
        reasoning_points=[
            "Both careers are scored using the same weighted rubric.",
            "Factor deltas show which weighted component creates the biggest advantage.",
            "Radar overlay uses the underlying role metrics (skill, growth, salary, stability, automation safety).",
        ],
        decision_trace={"score_delta": score_delta, **factor_deltas},
        notes=f"Dominant advantage factor: {dominant_advantage_factor}. Positive delta means career A wins.",
    )

    return ComparisonResponse(
        career_a=a,
        career_b=b,
        score_delta=score_delta,
        factor_deltas=factor_deltas,
        dominant_advantage_factor=dominant_advantage_factor,
        explainability=explain,
    )
