from __future__ import annotations

from fastapi import Body, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import ValidationError

from .agent import analyze_profile
from .agent import CAREERS
from .auth import router as auth_router
from .auth import admin_stats, delete_user, get_user_meta, list_users, update_user
from .auth import create_user_goal, get_user_goal, list_user_goals
from .auth import get_user_profile, upsert_user_profile
from .auth import get_current_user
from .career_profile import get_career_profile
from .comparison_engine import compare
from .models import (
    AdminStatsResponse,
    AdminUserRow,
    AdminUserUpdateRequest,
    AnalysisResponse,
    CareerOption,
    CareerProfileResponse,
    ComparisonRequest,
    ComparisonResponse,
    ProfileInput,
    RoadmapResponse,
    UserMeResponse,
    UserGoalDetail,
    UserGoalSummary,
    UserPublic,
)
from .llm import groq_reasoning_points
from .roadmap_generator import generate_roadmap
from .pdf_generator import generate_roadmap_pdf

app = FastAPI(title="AI Specialization Decision Agent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


def require_admin(user: UserPublic = Depends(get_current_user)) -> UserPublic:
    # Role comes from JWT, but we also re-check DB meta to be safe.
    meta = get_user_meta(user.id) or {}
    if str(meta.get("role") or "USER") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


@app.get("/careers", response_model=list[CareerOption])
def careers() -> list[CareerOption]:
    return [CareerOption(id=c.id, title=c.title, category=getattr(c, "category", "General"), required_skills=c.required_skills) for c in CAREERS]


@app.post("/analyze", response_model=AnalysisResponse)
def analyze(payload: ProfileInput, user: UserPublic = Depends(get_current_user)) -> AnalysisResponse:
    _ = user
    # Persist profile for returning users (so onboarding is not required next login).
    upsert_user_profile(user_id=user.id, profile=payload.model_dump())
    analysis = analyze_profile(payload)
    pts = groq_reasoning_points(analysis)
    if pts:
        analysis = analysis.model_copy(
            update={
                "explainability": analysis.explainability.model_copy(
                    update={"reasoning_points": pts}
                )
            }
        )
    return analysis


@app.get("/me/goals", response_model=list[UserGoalSummary])
def me_goals(user: UserPublic = Depends(get_current_user)) -> list[UserGoalSummary]:
    rows = list_user_goals(user.id)
    out: list[UserGoalSummary] = []
    for r in rows:
        profile = r.get("profile") or {}
        analysis = r.get("analysis") or {}

        goal_title = str(profile.get("goal") or "")
        match_percent = 0.0
        explanation = ""
        try:
            top = analysis.get("top_matches") or []
            if isinstance(top, list) and goal_title:
                found = next((m for m in top if (m or {}).get("title") == goal_title), None)
                if found:
                    match_percent = float(((found.get("breakdown") or {}).get("match_percent")) or 0.0)
        except Exception:
            match_percent = 0.0

        try:
            pts = (((analysis.get("explainability") or {}).get("reasoning_points")) or [])
            if isinstance(pts, list) and pts:
                explanation = str(pts[0])
        except Exception:
            explanation = ""

        if not explanation:
            dom = str(analysis.get("dominant_decision_factor") or "")
            explanation = f"Top match is driven mostly by {dom} weighting." if dom else ""

        out.append(
            UserGoalSummary(
                id=int(r["id"]),
                goal_title=goal_title or "Career goal",
                match_percent=max(0.0, min(100.0, match_percent)),
                explanation=explanation or "",
            )
        )
    return out


@app.post("/me/goals", response_model=UserGoalDetail)
def me_goals_create(payload: ProfileInput, user: UserPublic = Depends(get_current_user)) -> UserGoalDetail:
    # Save last profile too for compatibility with existing dashboard flow.
    upsert_user_profile(user_id=user.id, profile=payload.model_dump())

    analysis = analyze_profile(payload)
    pts = groq_reasoning_points(analysis)
    if pts:
        analysis = analysis.model_copy(
            update={
                "explainability": analysis.explainability.model_copy(
                    update={"reasoning_points": pts}
                )
            }
        )

    goal_id = create_user_goal(user_id=user.id, profile=payload.model_dump(), analysis=analysis.model_dump())
    return UserGoalDetail(id=goal_id, profile=payload, analysis=analysis)


@app.get("/me/goals/{goal_id}", response_model=UserGoalDetail)
def me_goals_get(goal_id: int, user: UserPublic = Depends(get_current_user)) -> UserGoalDetail:
    row = get_user_goal(user_id=user.id, goal_id=int(goal_id))
    if not row:
        raise HTTPException(status_code=404, detail="Goal not found")
    try:
        profile = ProfileInput.model_validate(row["profile"])
        analysis = AnalysisResponse.model_validate(row["analysis"])
    except Exception:
        raise HTTPException(status_code=500, detail="Saved goal data is invalid")
    return UserGoalDetail(id=int(row["id"]), profile=profile, analysis=analysis)


@app.get("/me/profile", response_model=ProfileInput)
def me_profile(user: UserPublic = Depends(get_current_user)) -> ProfileInput:
    profile = get_user_profile(user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile saved")
    try:
        return ProfileInput.model_validate(profile)
    except Exception:
        raise HTTPException(status_code=500, detail="Saved profile is invalid")


@app.put("/me/profile", response_model=ProfileInput)
def me_profile_put(payload: ProfileInput, user: UserPublic = Depends(get_current_user)) -> ProfileInput:
    upsert_user_profile(user_id=user.id, profile=payload.model_dump())
    return payload


@app.get("/me", response_model=UserMeResponse)
def me(user: UserPublic = Depends(get_current_user)) -> UserMeResponse:
    meta = get_user_meta(user.id)
    if not meta:
        return UserMeResponse(id=user.id, email=user.email, role="USER", status="ACTIVE")
    return UserMeResponse(
        id=int(meta["id"]),
        email=str(meta["email"]),
        role=str(meta.get("role") or "USER"),
        status=str(meta.get("status") or "ACTIVE"),
    )


@app.get("/admin/stats", response_model=AdminStatsResponse)
def admin_stats_route(_user: UserPublic = Depends(require_admin)) -> AdminStatsResponse:
    stats = admin_stats()
    return AdminStatsResponse(
        total_users=int(stats.get("total_users") or 0),
        total_goals=int(stats.get("total_goals") or 0),
        system_health="OK",
    )


@app.get("/admin/users", response_model=list[AdminUserRow])
def admin_users_route(_user: UserPublic = Depends(require_admin)) -> list[AdminUserRow]:
    rows = list_users()
    return [
        AdminUserRow(
            id=int(r["id"]),
            email=str(r["email"]),
            role=str(r.get("role") or "USER"),
            subscription="FREE",
            status=str(r.get("status") or "ACTIVE"),
            joined_at=str(r.get("created_at") or ""),
        )
        for r in rows
    ]


@app.patch("/admin/users/{user_id}", response_model=AdminUserRow)
def admin_user_patch(
    user_id: int,
    payload: AdminUserUpdateRequest,
    _user: UserPublic = Depends(require_admin),
) -> AdminUserRow:
    update_user(user_id=int(user_id), role=payload.role, status=payload.status)
    meta = get_user_meta(int(user_id))
    if not meta:
        raise HTTPException(status_code=404, detail="User not found")
    return AdminUserRow(
        id=int(meta["id"]),
        email=str(meta["email"]),
        role=str(meta.get("role") or "USER"),
        subscription="FREE",
        status=str(meta.get("status") or "ACTIVE"),
        joined_at=str(meta.get("created_at") or ""),
    )


@app.delete("/admin/users/{user_id}")
def admin_user_delete(user_id: int, _user: UserPublic = Depends(require_admin)) -> dict:
    delete_user(int(user_id))
    return {"status": "ok"}


@app.post("/roadmap/pdf")
def roadmap_pdf(payload: dict = Body(...), user: UserPublic = Depends(get_current_user)) -> Response:
    _ = user
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Invalid request body")

    career_id = payload.get("career_id")
    if not career_id:
        raise HTTPException(status_code=422, detail="Missing career_id")

    profile_raw = payload.get("profile")
    if not profile_raw:
        profile_raw = {
            "skills": payload.get("skills", []),
            "interests": payload.get("interests", []),
            "goal": payload.get("goal"),
            "experience_level": payload.get("experience_level"),
            "risk_tolerance": payload.get("risk_tolerance"),
            "salary_preference": payload.get("salary_preference"),
        }

    try:
        profile = ProfileInput.model_validate(profile_raw)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"message": "Invalid profile payload", "errors": e.errors()})
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid profile payload: {e}")

    roadmap = generate_roadmap(profile, career_id)
    pdf_bytes = generate_roadmap_pdf(roadmap=roadmap, profile=profile)
    filename = f"roadmap_{career_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


@app.post("/roadmap/{career_id}", response_model=RoadmapResponse)
def roadmap(career_id: str, payload: ProfileInput, user: UserPublic = Depends(get_current_user)) -> RoadmapResponse:
    _ = user
    return generate_roadmap(payload, career_id)


@app.post("/career/{career_id}", response_model=CareerProfileResponse)
def career_profile(
    career_id: str, payload: ProfileInput, user: UserPublic = Depends(get_current_user)
) -> CareerProfileResponse:
    _ = user
    return get_career_profile(payload, career_id)


@app.post("/compare", response_model=ComparisonResponse)
def compare_careers(payload: ComparisonRequest, user: UserPublic = Depends(get_current_user)) -> ComparisonResponse:
    _ = user
    return compare(payload)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
