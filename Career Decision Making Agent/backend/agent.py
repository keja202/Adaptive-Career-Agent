from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

from .skill_utils import expand_user_skills
from .models import (
    AnalysisResponse,
    CareerMatch,
    Explainability,
    MatchBreakdown,
    ProfileInput,
    RadarMetrics,
)


@dataclass(frozen=True)
class CareerSpec:
    id: str
    title: str
    category: str
    required_skills: List[str]
    growth: float
    salary: float
    stability: float
    automation_risk: float


CAREERS: List[CareerSpec] = [
    CareerSpec(
        id="ml_engineer",
        title="ML Engineer",
        category="AI",
        required_skills=["python", "ml", "numpy", "pandas", "scikit-learn", "sql", "git", "docker"],
        growth=86,
        salary=82,
        stability=72,
        automation_risk=28,
    ),
    CareerSpec(
        id="data_scientist",
        title="Data Scientist",
        category="Data",
        required_skills=["python", "statistics", "pandas", "sql", "ml", "visualization", "experimentation"],
        growth=84,
        salary=80,
        stability=70,
        automation_risk=34,
    ),
    CareerSpec(
        id="data_engineer",
        title="Data Engineer",
        category="Data",
        required_skills=["sql", "python", "etl", "spark", "data_warehousing", "cloud", "airflow"],
        growth=78,
        salary=76,
        stability=78,
        automation_risk=22,
    ),
    CareerSpec(
        id="mlops_engineer",
        title="MLOps Engineer",
        category="Cloud",
        required_skills=["python", "ml", "docker", "kubernetes", "ci/cd", "cloud", "monitoring"],
        growth=82,
        salary=84,
        stability=76,
        automation_risk=18,
    ),
    CareerSpec(
        id="nlp_engineer",
        title="NLP Engineer",
        category="AI",
        required_skills=["python", "nlp", "transformers", "deep_learning", "pytorch", "data_processing"],
        growth=88,
        salary=85,
        stability=66,
        automation_risk=38,
    ),
    CareerSpec(
        id="software_engineer",
        title="Software Engineer",
        category="Software",
        required_skills=["programming", "data_structures", "algorithms", "git", "testing", "apis", "databases"],
        growth=76,
        salary=78,
        stability=82,
        automation_risk=26,
    ),
    CareerSpec(
        id="backend_developer",
        title="Backend Developer",
        category="Software",
        required_skills=["python", "java", "node", "apis", "sql", "databases", "auth", "testing"],
        growth=74,
        salary=76,
        stability=82,
        automation_risk=24,
    ),
    CareerSpec(
        id="frontend_developer",
        title="Frontend Developer",
        category="Software",
        required_skills=["javascript", "react", "html", "css", "ui", "apis", "testing"],
        growth=72,
        salary=70,
        stability=74,
        automation_risk=32,
    ),
    CareerSpec(
        id="full_stack_developer",
        title="Full Stack Developer",
        category="Software",
        required_skills=["javascript", "react", "apis", "sql", "databases", "auth", "deployment", "git"],
        growth=75,
        salary=74,
        stability=78,
        automation_risk=30,
    ),
    CareerSpec(
        id="devops_engineer",
        title="DevOps Engineer",
        category="Cloud",
        required_skills=["linux", "docker", "kubernetes", "ci/cd", "cloud", "terraform", "monitoring"],
        growth=79,
        salary=82,
        stability=80,
        automation_risk=18,
    ),
    CareerSpec(
        id="cloud_engineer",
        title="Cloud Engineer",
        category="Cloud",
        required_skills=["cloud", "networking", "security", "linux", "terraform", "containers", "monitoring"],
        growth=78,
        salary=80,
        stability=80,
        automation_risk=20,
    ),
    CareerSpec(
        id="data_analyst",
        title="Data Analyst",
        category="Data",
        required_skills=["sql", "excel", "statistics", "dashboards", "visualization", "business"],
        growth=66,
        salary=62,
        stability=76,
        automation_risk=42,
    ),
    CareerSpec(
        id="cybersecurity_engineer",
        title="Cybersecurity Engineer",
        category="Security",
        required_skills=["networking", "security", "linux", "threat_modeling", "incident_response", "scripting"],
        growth=82,
        salary=78,
        stability=86,
        automation_risk=14,
    ),
    CareerSpec(
        id="mobile_app_developer",
        title="Mobile App Developer",
        category="Software",
        required_skills=["android", "ios", "kotlin", "swift", "ui", "apis", "testing"],
        growth=70,
        salary=68,
        stability=72,
        automation_risk=30,
    ),
]


def _normalize_terms(items: List[str]) -> List[str]:
    return [x.strip().lower() for x in items if x and x.strip()]


def _skill_match(required: List[str], user_skills: List[str]) -> Tuple[float, List[str]]:
    required_norm = _normalize_terms(required)
    user_norm = set(_normalize_terms(user_skills))

    hit = [s for s in required_norm if s in user_norm]
    missing = [s for s in required_norm if s not in user_norm]

    if not required_norm:
        return 0.0, []
    return (len(hit) / len(required_norm)) * 100.0, missing


def _risk_fit(risk_tolerance: int, automation_risk: float) -> float:
    # automation_risk: higher = worse. If user risk tolerance is high, they can tolerate higher risk.
    # Convert tolerance into preferred max risk, then compute fit.
    preferred_max = 30 + (risk_tolerance * 0.6)  # 30..90
    delta = max(0.0, automation_risk - preferred_max)
    return max(0.0, 100.0 - (delta * 2.0))


def _salary_fit(salary_preference: int, salary_score: float) -> float:
    alpha = salary_preference / 100.0
    return (salary_score * alpha) + (60.0 * (1.0 - alpha))


def analyze_profile(profile: ProfileInput) -> AnalysisResponse:
    skills = expand_user_skills(profile.skills)

    weights: Dict[str, float] = {
        "skills": 0.40,
        "growth": 0.20,
        "salary": 0.20,
        "stability": 0.10,
        "risk": 0.10,
    }

    if profile.experience_level == "Beginner":
        weights["skills"] = 0.5
    if profile.experience_level == "Advanced":
        weights["growth"] = 0.3

    matches: List[CareerMatch] = []

    for c in CAREERS:
        skill_match, missing = _skill_match(c.required_skills, skills)
        salary_fit = _salary_fit(profile.salary_preference, c.salary)
        risk_fit = _risk_fit(profile.risk_tolerance, c.automation_risk)

        # Score components (0..100)
        components: Dict[str, float] = {
            "skills": skill_match,
            "growth": c.growth,
            "salary": salary_fit,
            "stability": c.stability,
            "risk": risk_fit,
        }

        score = sum(components[k] * weights[k] for k in weights)

        # Feasibility: mostly inverse of skill gap; boosted by experience level
        gap = 100.0 - skill_match
        exp_boost = {"Beginner": 0.0, "Intermediate": 6.0, "Advanced": 10.0}[profile.experience_level]
        feasibility = max(0.0, min(100.0, (100.0 - gap) + exp_boost))

        contributions = {k: components[k] * weights[k] for k in weights}
        dominant_factor = max(contributions.items(), key=lambda kv: kv[1])[0]

        match = CareerMatch(
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
            missing_skills=missing[:10],
            feasibility=round(feasibility, 1),
            dominant_factor=dominant_factor,
        )
        matches.append(match)

    matches.sort(key=lambda m: m.breakdown.match_percent, reverse=True)
    top = matches[:5]

    if len(top) >= 2:
        spread = max(0.0, min(30.0, top[0].breakdown.match_percent - top[1].breakdown.match_percent))
    else:
        spread = 10.0

    completeness = 0.0
    if top:
        completeness = top[0].breakdown.skill_match_percent

    confidence = max(0.0, min(100.0, (0.6 * completeness) + (1.3 * spread) + 10.0))

    dominant_decision_factor = top[0].dominant_factor if top else "skills"

    reasoning_points = [
        f"Top match is driven mostly by {dominant_decision_factor} weighting.",
        "Skill gap impacts feasibility more than raw score.",
        "Risk tolerance and salary preference adjust fit rather than hard-filtering careers.",
    ]

    decision_trace: Dict[str, float] = {}
    if top:
        # Show contributions for best match
        best = top[0]
        decision_trace = {
            "skills": round(best.breakdown.skill_match_percent * weights["skills"], 2),
            "growth": round(best.breakdown.growth_percent * weights["growth"], 2),
            "salary": round(best.breakdown.salary_fit_percent * weights["salary"], 2),
            "stability": round(best.radar.stability * weights["stability"], 2),
            "risk": round(_risk_fit(profile.risk_tolerance, best.radar.automation_risk) * weights["risk"], 2),
        }

    return AnalysisResponse(
        profile=profile,
        confidence_score=round(confidence, 1),
        dominant_decision_factor=dominant_decision_factor,
        top_matches=top,
        explainability=Explainability(
            weighted_factors=weights,
            reasoning_points=reasoning_points,
            decision_trace=decision_trace,
            notes="Deterministic scoring baseline. Groq reasoning hook will be added next.",
        ),
    )
