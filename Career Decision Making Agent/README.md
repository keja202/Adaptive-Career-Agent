# AdaptiveCareerAgent

AdaptiveCareerAgent is a full-stack **career decision making agent** that analyzes a user’s tech profile, intelligently ranks best-fit roles with transparent reasoning, generates a personalized learning roadmap, provides role-specific SWOT analysis, enables side-by-side career comparison, and exports structured roadmaps as a downloadable PDF.

Built with React + Tailwind on the frontend and FastAPI on the backend, with optional LLM-based narrative enhancement.

---

## Overview

AdaptiveCareerAgent is an intelligent career decision making agent designed to guide users toward the most suitable tech roles based on:

- Skills  
- Interests  
- Experience level  
- Risk tolerance  
- Salary preference  

The system explains why a role fits, highlights skill gaps, generates a structured 6-month roadmap, and enables comparison across career paths.

---

## Highlights

- Profile onboarding → intelligent analysis  
- Ranked tech roles (agent-prioritized)  
- Explainability (reasoning points + factor trace)  
- Personalized roadmap (timeline, milestones, resources)  
- SWOT analysis (Strengths / Weaknesses / Opportunities / Threats)  
- Career comparison (side-by-side weighted deltas)  
- Roadmap PDF download  

---

## Tech Stack

### Frontend
- React (Vite)
- TailwindCSS
- React Router
- Recharts
- Framer Motion

### Backend
- FastAPI
- Pydantic
- JWT Authentication
- ReportLab (PDF generation)
- Optional Groq LLM (OpenAI-compatible)

---

## How It Works

### 1. Profile Submission

User provides:
- Skills & interests  
- Target goal  
- Experience level (Beginner / Intermediate / Advanced)  
- Risk tolerance (0–100)  
- Salary preference (0–100)

### 2. Deterministic Role Scoring

Backend:
- Computes weighted scores  
- Ranks roles  
- Generates feasibility estimates  
- Produces explainability traces  

### 3. LLM Enhancement

If enabled:
- Adds concise reasoning summaries  
- Enhances roadmap narrative  
- Generates SWOT narrative  

> Core ranking remains deterministic for consistency.  
> LLM enhances clarity — not decision logic.

---
## Project Structure

AdaptiveCareerAgent/
│
├── src/ # React frontend
│
├── backend/ # FastAPI backend
│ ├── main.py # API routes
│ ├── agent.py # Decision-making logic
│ ├── roadmap_generator.py # Roadmap engine
│ ├── career_profile.py # SWOT logic
│ ├── llm.py # Optional LLM integration
│ ├── pdf_generator.py # PDF export module
│ └── requirements.txt


---

## Setup & Run

### Backend


py -m pip install -r backend\requirements.txt
py -m uvicorn backend.main:app --reload --port 8000


Backend runs at:
http://127.0.0.1:8000

### Frontend


npm install
npm run dev


Frontend runs at:
http://localhost:5173

---

## Future Enhancements

- Integrate real-time market datasets
- Expand role catalog
- Add adaptive re-ranking based on learning progress
- Enhance explainability visualizations
- Implement feedback loops for personalization


