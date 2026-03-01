# AI-Specialization-agent
AI Specialization Pro is a full-stack career decision agent that analyzes a user’s AI profile, ranks best-fit roles with explainability, generates a personalized roadmap + SWOT analysis, supports role comparison, and exports roadmaps as a PDF. Built with React + Tailwind and FastAPI with optional Groq LLM narratives.


**AI Specialization Pro**

AI Specialization Pro is a full-stack AI career decision agent that helps users choose the best AI role based on their skills and preferences, explains why those roles fit, generates a personalized 6-month roadmap, provides a SWOT analysis per role, supports role comparison, and exports roadmaps as a PDF.


**Demo Highlights**

- Profile onboarding -> analysis
- Ranked AI roles (agent-ordered)
- Explainability (reasoning points + factor trace)
- Personalized Roadmap (timeline, projects, resources)
- SWOT Analysis (Strengths/Weaknesses/Opportunities/Threats)
- Career Comparison (side-by-side weighted deltas)
- Roadmap PDF download


**Tech Stack**

Frontend
- React (Vite)
- TailwindCSS
- React Router
- Recharts + Framer Motion

Backend
- FastAPI + Pydantic
- JWT auth
- ReportLab (PDF generation)
- Optional Groq LLM (OpenAI-compatible) for narrative/explainability enrichment



**How It Works (High-Level)**

1) User submits profile:
   - skills, interests, goal
   - experience level (Beginner / Intermediate / Advanced)
   - risk tolerance and salary preference (0-100)

2) Backend generates deterministic scores and ranks roles.

3) Optional LLM layer adds:
   - short reasoning points for explainability
   - narrative summaries for Roadmap and SWOT

Note: The ranking/scoring is deterministic for consistency; the LLM is used to improve readability and user experience.

**Project Structure**

.
|-- src/                    # React frontend
|-- backend/                # FastAPI backend
|   |-- main.py              # API routes
|   |-- agent.py             # deterministic role scoring + ranking
|   |-- roadmap_generator.py # roadmap logic (+ optional LLM narrative)
|   |-- career_profile.py    # SWOT logic (+ optional LLM narrative)
|   |-- llm.py               # Groq integration (optional)
|   |-- pdf_generator.py     # ReportLab PDF generation
|   |-- requirements.txt



**Setup & Run (Local)**

Backend (FastAPI)
From the repo root:

  py -m pip install -r backend\requirements.txt
  py -m uvicorn backend.main:app --reload --port 8000

Backend runs on:
  http://127.0.0.1:8000

Health check:
  GET /health

Frontend (React)
From the repo root:

  npm install
  npm run dev

Frontend runs on:
  http://localhost:5173



**Environment Variables**

Frontend
Create .env (optional):

  VITE_API_BASE_URL=http://127.0.0.1:8000

Backend (Optional LLM)
LLM is optional; the app works without it.

  GROQ_API_KEY=your_key_here
  GROQ_MODEL=llama-3.1-8b-instant

If GROQ_API_KEY is not set:
- the app still runs
- narratives/reasoning points fall back to deterministic text



**Key API Endpoints**

- POST /auth/signup
- POST /auth/login
- GET  /careers
- POST /analyze
- POST /roadmap/{career_id}
- POST /roadmap/pdf (downloads PDF)
- POST /career/{career_id} (SWOT + stats)
- POST /compare



**Roadmap / Future Improvements**

- Add real market datasets (salary, demand, growth by region)
- Expand the role catalog beyond the current curated set
- Track user learning progress and update recommendations over time
- Add more explainability visualizations and feedback loops
