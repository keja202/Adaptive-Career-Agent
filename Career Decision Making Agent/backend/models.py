from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(min_length=8, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: int
    email: EmailStr


class UserMeResponse(BaseModel):
    id: int
    email: EmailStr
    role: Literal["USER", "ADMIN"] = "USER"
    status: Literal["ACTIVE", "DISABLED"] = "ACTIVE"


class AdminStatsResponse(BaseModel):
    total_users: int = 0
    total_goals: int = 0
    system_health: str = "OK"


class AdminUserRow(BaseModel):
    id: int
    email: EmailStr
    role: Literal["USER", "ADMIN"] = "USER"
    subscription: str = "FREE"
    status: Literal["ACTIVE", "DISABLED"] = "ACTIVE"
    joined_at: str = ""


class AdminUserUpdateRequest(BaseModel):
    role: Optional[Literal["USER", "ADMIN"]] = None
    status: Optional[Literal["ACTIVE", "DISABLED"]] = None


ExperienceLevel = Literal["Beginner", "Intermediate", "Advanced"]


class CareerOption(BaseModel):
    id: str
    title: str
    category: str = "General"
    required_skills: List[str] = Field(default_factory=list)


class ProfileInput(BaseModel):
    skills: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    goal: str
    experience_level: ExperienceLevel
    risk_tolerance: int = Field(ge=0, le=100)
    salary_preference: int = Field(ge=0, le=100)


class RadarMetrics(BaseModel):
    skill_match: float = Field(ge=0, le=100)
    growth: float = Field(ge=0, le=100)
    salary: float = Field(ge=0, le=100)
    stability: float = Field(ge=0, le=100)
    automation_risk: float = Field(ge=0, le=100)


class MatchBreakdown(BaseModel):
    match_percent: float = Field(ge=0, le=100)
    skill_match_percent: float = Field(ge=0, le=100)
    salary_fit_percent: float = Field(ge=0, le=100)
    growth_percent: float = Field(ge=0, le=100)


class CareerMatch(BaseModel):
    id: str
    title: str
    breakdown: MatchBreakdown
    radar: RadarMetrics
    missing_skills: List[str] = Field(default_factory=list)
    feasibility: float = Field(ge=0, le=100)
    dominant_factor: str


class Explainability(BaseModel):
    weighted_factors: dict[str, float]
    reasoning_points: List[str] = Field(default_factory=list)
    decision_trace: dict[str, float] = Field(default_factory=dict)
    notes: Optional[str] = None


class AnalysisResponse(BaseModel):
    profile: ProfileInput
    confidence_score: float = Field(ge=0, le=100)
    dominant_decision_factor: str
    top_matches: List[CareerMatch]
    explainability: Explainability


class UserGoalSummary(BaseModel):
    id: int
    goal_title: str
    match_percent: float = Field(ge=0, le=100)
    explanation: str


class UserGoalDetail(BaseModel):
    id: int
    profile: ProfileInput
    analysis: AnalysisResponse


class RoadmapGap(BaseModel):
    have: List[str] = Field(default_factory=list)
    need: List[str] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    gap_percent: float = Field(ge=0, le=100)


class RoadmapPhase(BaseModel):
    title: str
    months: str
    focus: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)


class RoadmapProject(BaseModel):
    title: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    outcomes: List[str] = Field(default_factory=list)


class RoadmapResource(BaseModel):
    title: str
    kind: Literal["Course", "Tool", "Certification", "Docs"]
    url: str


class RoadmapResponse(BaseModel):
    career_id: str
    career_title: str
    experience_level: ExperienceLevel
    gap: RoadmapGap
    timeline: List[RoadmapPhase]
    project_suggestions: List[RoadmapProject]
    learning_resources: List[RoadmapResource]
    explainability: Explainability
    narrative: Optional[str] = None


class SWOT(BaseModel):
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    threats: List[str] = Field(default_factory=list)


class CareerProfileStats(BaseModel):
    growth_rate: float = Field(ge=0, le=100)
    salary_low: int = Field(ge=0)
    salary_high: int = Field(ge=0)
    automation_risk: float = Field(ge=0, le=100)
    stability: float = Field(ge=0, le=100)


class CareerProfileResponse(BaseModel):
    career_id: str
    career_title: str
    swot: SWOT
    stats: CareerProfileStats
    explainability: Explainability
    narrative: Optional[str] = None


class ComparisonRequest(BaseModel):
    career_a_id: str
    career_b_id: str
    profile: ProfileInput


class ComparedCareer(BaseModel):
    id: str
    title: str
    breakdown: MatchBreakdown
    radar: RadarMetrics
    feasibility: float = Field(ge=0, le=100)
    missing_skills: List[str] = Field(default_factory=list)
    dominant_factor: str
    factor_contributions: dict[str, float] = Field(default_factory=dict)


class ComparisonResponse(BaseModel):
    career_a: ComparedCareer
    career_b: ComparedCareer
    score_delta: float
    factor_deltas: dict[str, float]
    dominant_advantage_factor: str
    explainability: Explainability


class RoadmapPdfRequest(BaseModel):
    career_id: str
    profile: ProfileInput
