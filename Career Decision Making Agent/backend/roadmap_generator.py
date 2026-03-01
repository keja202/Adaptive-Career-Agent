from __future__ import annotations

from typing import List

from .agent import CAREERS
from .llm import groq_roadmap_narrative
from .skill_utils import expand_user_skills
from .models import (
    Explainability,
    ProfileInput,
    RoadmapGap,
    RoadmapPhase,
    RoadmapProject,
    RoadmapResource,
    RoadmapResponse,
)


def _normalize(items: List[str]) -> List[str]:
    return [x.strip().lower() for x in items if x and x.strip()]


def _career_by_id(career_id: str):
    for c in CAREERS:
        if c.id == career_id:
            return c
    return None


def _gap(required: List[str], user: List[str]) -> RoadmapGap:
    req = _normalize(required)
    have = set(expand_user_skills(user))
    missing = [s for s in req if s not in have]
    have_list = [s for s in req if s in have]
    gap_percent = 0.0 if not req else (len(missing) / len(req)) * 100.0
    return RoadmapGap(have=have_list, need=req, missing=missing, gap_percent=round(gap_percent, 1))


def generate_roadmap(profile: ProfileInput, career_id: str) -> RoadmapResponse:
    career = _career_by_id(career_id)
    if career is None:
        raise ValueError("Unknown career_id")

    gap = _gap(career.required_skills, profile.skills)

    missing = gap.missing
    top_missing = missing[:3]
    exp = profile.experience_level

    if exp == "Beginner":
        phases = [
            RoadmapPhase(
                title="Foundations",
                months="Month 1–2",
                focus=[
                    "Close gaps: " + ", ".join(top_missing),
                    "Python fluency",
                    "Math + stats basics",
                    "Git + notebooks",
                ],
                projects=["EDA mini-project", "Data cleaning pipeline"],
            ),
            RoadmapPhase(
                title="Core skills",
                months="Month 3–4",
                focus=["Model training", "Evaluation", "SQL basics"],
                projects=["Baseline model + metrics report", "SQL analytics dashboard"],
            ),
            RoadmapPhase(
                title="Portfolio + deployment",
                months="Month 5–6",
                focus=["End-to-end project", "API serving", "Docker basics"],
                projects=["Capstone with FastAPI", "Deploy a model service"],
            ),
        ]
    elif exp == "Intermediate":
        phases = [
            RoadmapPhase(
                title="Sharpen + fill gaps",
                months="Month 1–2",
                focus=["Close missing skills", "Strong evaluation habits"],
                projects=["Rebuild a previous project with better metrics"],
            ),
            RoadmapPhase(
                title="Systems + scale",
                months="Month 3–4",
                focus=["Pipelines", "Experiment tracking", "Deployment patterns"],
                projects=["Training pipeline + model registry"],
            ),
            RoadmapPhase(
                title="Interview-ready portfolio",
                months="Month 5–6",
                focus=["Case studies", "Performance + reliability"],
                projects=["Capstone with monitoring + CI"],
            ),
        ]
    else:
        phases = [
            RoadmapPhase(
                title="Specialize",
                months="Month 1–2",
                focus=["Pick a niche", "Deep dive", "Benchmarking"],
                projects=["Reproduce a paper/blog result"],
            ),
            RoadmapPhase(
                title="Production-grade",
                months="Month 3–4",
                focus=["MLOps", "Scaling", "Observability"],
                projects=["Production service with monitoring"],
            ),
            RoadmapPhase(
                title="Authority",
                months="Month 5–6",
                focus=["Open-source", "Writing", "Leadership"],
                projects=["Open-source contribution + technical writeup"],
            ),
        ]

    diff = "Easy" if exp == "Beginner" else "Medium" if exp == "Intermediate" else "Hard"

    project_suggestions = [
        RoadmapProject(
            title=f"{career.title} Capstone: End-to-end system",
            difficulty=diff,
            outcomes=[
                "Problem framing + dataset",
                "Train + evaluate",
                "Serve via FastAPI",
                "Write a clean README + demo"
            ],
        ),
        RoadmapProject(
            title="Model monitoring dashboard",
            difficulty="Medium" if exp != "Beginner" else "Easy",
            outcomes=["Basic drift checks", "Alerts", "Simple dashboard"],
        ),
    ]

    resources: List[RoadmapResource] = [
        RoadmapResource(title="FastAPI Documentation", kind="Docs", url="https://fastapi.tiangolo.com/"),
        RoadmapResource(title="scikit-learn User Guide", kind="Docs", url="https://scikit-learn.org/stable/user_guide.html"),
        RoadmapResource(title="Docker Documentation", kind="Docs", url="https://docs.docker.com/"),
    ]

    # Add career-specific hints
    if career_id == "mlops_engineer":
        resources.append(
            RoadmapResource(title="Kubernetes Docs", kind="Docs", url="https://kubernetes.io/docs/"),
        )
    if career_id == "nlp_engineer":
        resources.append(
            RoadmapResource(title="Hugging Face Transformers", kind="Docs", url="https://huggingface.co/docs/transformers"),
        )

    notes = "Roadmap is generated from required skill set + your current skills and experience level."
    if missing:
        notes += " Prioritize closing the top missing skills first."

    explainability = Explainability(
        weighted_factors={"gap_percent": 1.0},
        reasoning_points=[
            "Timeline phases are adapted to your experience level.",
            "Missing skills drive the early focus areas and suggested projects.",
        ],
        decision_trace={"gap_percent": gap.gap_percent},
        notes=notes,
    )

    roadmap = RoadmapResponse(
        career_id=career.id,
        career_title=career.title,
        experience_level=profile.experience_level,
        gap=gap,
        timeline=phases,
        project_suggestions=project_suggestions,
        learning_resources=resources,
        explainability=explainability,
    )

    narrative = groq_roadmap_narrative(profile=profile.model_dump(), roadmap=roadmap.model_dump())
    if narrative:
        roadmap = roadmap.model_copy(update={"narrative": narrative})

    return roadmap
