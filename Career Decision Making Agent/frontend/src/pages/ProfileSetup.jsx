import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import SearchableGroupedSelect from '../components/SearchableGroupedSelect'

export default function ProfileSetup() {
  const navigate = useNavigate()
  const [skillsText, setSkillsText] = useState('')
  const [exploreItems, setExploreItems] = useState([])
  const [exploreText, setExploreText] = useState('')
  const [goal, setGoal] = useState('ML Engineer')
  const [experienceLevel, setExperienceLevel] = useState('Beginner')
  const [experienceMode, setExperienceMode] = useState('manual')
  const [riskTolerance, setRiskTolerance] = useState(50)
  const [salaryPreference, setSalaryPreference] = useState(50)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [careerOptions, setCareerOptions] = useState([])
  const [step, setStep] = useState(1)

  const canContinueStep1 = Boolean(goal)
  const canContinueStep2 = true
  const isLast = step === 3

  const onNext = () => {
    if (step === 1 && !canContinueStep1) return
    setStep((s) => Math.min(3, s + 1))
  }

  const onBack = () => setStep((s) => Math.max(1, s - 1))

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get('/careers')
        setCareerOptions(res?.data || [])
        if (!goal && res?.data?.[0]?.title) setGoal(res.data[0].title)
      } catch {
        setCareerOptions([])
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skills = useMemo(
    () =>
      skillsText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    [skillsText]
  )

  const interests = useMemo(() => (Array.isArray(exploreItems) ? exploreItems : []).filter(Boolean), [exploreItems])

  const exploreSuggestions = useMemo(
    () => [
      { label: 'Generative AI', category: 'AI' },
      { label: 'LLMs', category: 'AI' },
      { label: 'NLP', category: 'AI' },
      { label: 'Computer Vision', category: 'AI' },
      { label: 'Deep Learning', category: 'AI' },
      { label: 'MLOps', category: 'Cloud' },
      { label: 'Data Engineering', category: 'Data' },
      { label: 'Data Analytics', category: 'Data' },
      { label: 'Cloud', category: 'Cloud' },
      { label: 'DevOps', category: 'Cloud' },
      { label: 'Cybersecurity', category: 'Security' },
      { label: 'System Design', category: 'Software' },
      { label: 'Frontend UI', category: 'Software' },
      { label: 'Backend APIs', category: 'Software' },
      { label: 'Mobile Development', category: 'Software' },
    ],
    []
  )

  const addExploreItem = (raw) => {
    const v = String(raw || '').trim()
    if (!v) return
    setExploreItems((prev) => {
      const arr = Array.isArray(prev) ? prev : []
      const norm = (s) => String(s || '').trim().toLowerCase()
      const exists = arr.some((x) => norm(x) === norm(v))
      if (exists) return arr
      return [...arr, v]
    })
  }

  const removeExploreItem = (raw) => {
    const v = String(raw || '').trim().toLowerCase()
    setExploreItems((prev) => (Array.isArray(prev) ? prev.filter((x) => String(x || '').trim().toLowerCase() !== v) : []))
  }

  const liveAnalysisConfidence = useMemo(() => {
    if (skills.length === 0) return 0

    const normalize = (s) => String(s || '').trim().toLowerCase()
    const skillsNorm = skills.map(normalize).filter(Boolean)
    const interestsNorm = interests.map(normalize).filter(Boolean)

    const knownInterests = new Set(
      [
        'nlp',
        'natural language processing',
        'computer vision',
        'cv',
        'mlops',
        'machine learning',
        'deep learning',
        'data science',
        'generative ai',
        'llm',
        'large language models',
        'reinforcement learning',
      ].map(normalize)
    )

    const selectedCareer = (careerOptions || []).find((c) => c?.title === goal)
    const required = Array.isArray(selectedCareer?.required_skills) ? selectedCareer.required_skills : []
    const requiredSet = new Set(required.map(normalize).filter(Boolean))

    const recognized = requiredSet.size === 0
      ? skillsNorm
      : skillsNorm.filter((s) => requiredSet.has(s))

    const matchRatio = required.length > 0 ? recognized.length / required.length : 0

    // Weighting: skills dominate this metric; interests are a small boost.
    const skillComponent = Math.round(Math.min(70, matchRatio * 70))
    const recognizedInterests = interestsNorm.filter((x) => knownInterests.has(x))
    const interestComponent = Math.min(25, recognizedInterests.length * 5)
    const total = Math.min(95, skillComponent + interestComponent)
    return total
  }, [skills, interests, careerOptions, goal])

  const inferredExperienceLevel = useMemo(() => {
    const normalize = (s) => String(s || '').trim().toLowerCase()
    const skillsNorm = skills.map(normalize).filter(Boolean)

    const selectedCareer = (careerOptions || []).find((c) => c?.title === goal)
    const required = Array.isArray(selectedCareer?.required_skills) ? selectedCareer.required_skills : []
    const requiredNorm = required.map(normalize).filter(Boolean)
    const requiredSet = new Set(requiredNorm)

    if (requiredNorm.length > 0) {
      const recognized = skillsNorm.filter((s) => requiredSet.has(s))
      const ratio = recognized.length / requiredNorm.length
      if (ratio >= 0.67) return 'Advanced'
      if (ratio >= 0.34) return 'Intermediate'
      return 'Beginner'
    }

    if (skillsNorm.length >= 8) return 'Advanced'
    if (skillsNorm.length >= 4) return 'Intermediate'
    return 'Beginner'
  }, [skills, careerOptions, goal])

  const effectiveExperienceLevel = experienceMode === 'auto' ? inferredExperienceLevel : experienceLevel

  const canSubmit = useMemo(() => goal && effectiveExperienceLevel, [goal, effectiveExperienceLevel])

  const onAnalyze = async () => {
    if (step !== 3) return
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const payload = {
        skills,
        interests,
        goal,
        experience_level: effectiveExperienceLevel,
        risk_tolerance: Number(riskTolerance),
        salary_preference: Number(salaryPreference)
      }
      localStorage.setItem('profile', JSON.stringify(payload))
      const { data } = await api.post('/me/goals', payload)
      localStorage.setItem('analysis', JSON.stringify(data?.analysis || {}))
      if (data?.id != null) localStorage.setItem('active_goal_id', String(data.id))
      navigate('/profile-goals', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Analyze failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 inline-flex rounded-full px-3 py-1">
          Onboarding Phase
        </div>
        <div className="mt-4 text-3xl font-semibold text-slate-900">Build Your AI Career Identity</div>
        <div className="mt-2 text-sm text-slate-600">
          Provide your technical foundation so our AI can curate your specialized path.
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold">
                    {step}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Professional Foundation</div>
                    <div className="text-xs text-slate-500">Refine the details below to personalize your analysis.</div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={
                      step === 1
                        ? 'rounded-full bg-blue-600 text-white text-xs font-semibold px-3 py-1.5'
                        : 'rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 hover:bg-slate-200'
                    }
                  >
                    1 • Identity
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className={
                      step === 2
                        ? 'rounded-full bg-blue-600 text-white text-xs font-semibold px-3 py-1.5'
                        : 'rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 hover:bg-slate-200'
                    }
                  >
                    2 • Expertise
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className={
                      step === 3
                        ? 'rounded-full bg-blue-600 text-white text-xs font-semibold px-3 py-1.5'
                        : 'rounded-full bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 hover:bg-slate-200'
                    }
                  >
                    3 • Goals
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                }}
                className="p-6 space-y-6"
              >
                {step === 1 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700">What is your primary career goal in AI?</label>
                      <div className="mt-2">
                        <SearchableGroupedSelect
                          options={careerOptions.length ? careerOptions : [{ id: 'loading', title: 'Loading…', category: 'General' }]}
                          value={goal}
                          onChange={(v) => setGoal(v)}
                          placeholder="Select your target role"
                          getOptionLabel={(c) => c?.title}
                          getOptionValue={(c) => c?.title}
                          groupBy={(c) => c?.category || 'General'}
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">Try to be specific about role and scale.</div>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-700">Skills (comma-separated)</label>
                        <input
                          value={skillsText}
                          onChange={(e) => setSkillsText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault()
                          }}
                          className="mt-2 w-full rounded-xl bg-white border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          placeholder="python, sql, numpy, docker"
                        />
                        <div className="mt-2 text-xs text-slate-500">Detected: {skills.length}</div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-700">Areas you want to explore</label>
                        <div className="mt-2 text-xs text-slate-500">
                          Skills = what you can do today. Explore = what you want to learn next.
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {exploreSuggestions.map((s) => {
                            const active = interests.some((x) => String(x || '').trim().toLowerCase() === String(s.label).toLowerCase())
                            return (
                              <button
                                key={s.label}
                                type="button"
                                onClick={() => (active ? removeExploreItem(s.label) : addExploreItem(s.label))}
                                className={
                                  active
                                    ? 'rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold'
                                    : 'rounded-full bg-white text-slate-700 border border-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-50'
                                }
                                title={s.category}
                              >
                                {s.label}
                              </button>
                            )
                          })}
                        </div>

                        <div className="mt-3 rounded-xl bg-white border border-slate-200 p-3">
                          <div className="flex items-center gap-2">
                            <input
                              value={exploreText}
                              onChange={(e) => setExploreText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addExploreItem(exploreText)
                                  setExploreText('')
                                }
                              }}
                              className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              placeholder="Add a custom topic (press Enter)"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                addExploreItem(exploreText)
                                setExploreText('')
                              }}
                              className="h-10 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                            >
                              Add
                            </button>
                          </div>

                          {interests.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {interests.map((it) => (
                                <span
                                  key={it}
                                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-800 px-3 py-1 text-xs font-semibold"
                                >
                                  {it}
                                  <button
                                    type="button"
                                    onClick={() => removeExploreItem(it)}
                                    className="text-slate-500 hover:text-slate-800"
                                    aria-label={`Remove ${it}`}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 text-xs text-slate-500">Pick a few chips above, or add your own.</div>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">Selected: {interests.length}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-700">Current Experience Level</div>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setExperienceMode('auto')}
                          className={
                            experienceMode === 'auto'
                              ? 'h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold'
                              : 'h-10 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50'
                          }
                        >
                          Auto
                        </button>

                        {['Beginner', 'Intermediate', 'Advanced'].map((x) => (
                          <button
                            key={x}
                            type="button"
                            onClick={() => {
                              setExperienceMode('manual')
                              setExperienceLevel(x)
                            }}
                            className={
                              experienceMode === 'manual' && experienceLevel === x
                                ? 'h-10 rounded-xl bg-blue-600 text-white text-sm font-semibold'
                                : 'h-10 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50'
                            }
                          >
                            {x}
                          </button>
                        ))}
                      </div>

                      {experienceMode === 'auto' ? (
                        <div className="mt-2 text-xs text-slate-500">
                          Suggested level: <span className="font-semibold text-slate-700">{inferredExperienceLevel}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-700">Risk tolerance</label>
                        <div className="text-xs text-slate-500">{riskTolerance}</div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={riskTolerance}
                        onChange={(e) => setRiskTolerance(e.target.value)}
                        className="mt-3 w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-700">Salary preference</label>
                        <div className="text-xs text-slate-500">{salaryPreference}</div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={salaryPreference}
                        onChange={(e) => setSalaryPreference(e.target.value)}
                        className="mt-3 w-full"
                      />
                    </div>
                  </div>
                ) : null}

                {error ? <div className="text-sm text-red-600">{error}</div> : null}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={onBack}
                    disabled={step === 1 || loading}
                    className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                  >
                    Back
                  </button>

                  {!isLast ? (
                    <button
                      type="button"
                      onClick={onNext}
                      disabled={(step === 1 && !canContinueStep1) || (step === 2 && !canContinueStep2) || loading}
                      className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition px-4 text-sm font-semibold text-white"
                    >
                      Continue →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onAnalyze}
                      disabled={!canSubmit || loading}
                      className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition px-4 text-sm font-semibold text-white"
                    >
                      {loading ? 'Analyzing…' : 'Analyze my profile'}
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500">Your data is encrypted and used only for career modeling.</div>

                {step === 3 ? (
                  <div className="mt-3 rounded-xl bg-white border border-slate-200 shadow-sm p-4">
                    <div className="text-xs font-semibold text-slate-900">How to choose these sliders</div>
                    <div className="mt-2 text-xs text-slate-600">
                      Risk tolerance controls how comfortable you are with fast-changing, higher-automation-risk roles.
                      Salary preference controls how strongly salary affects the ranking.
                    </div>
                    <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs text-slate-700">
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                        <div className="font-semibold text-slate-900">Risk tolerance</div>
                        <div className="mt-1 text-slate-600">Choose 30 for stable/safe. Choose 50 if unsure. Choose 70 if you’re OK with uncertainty.</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                        <div className="font-semibold text-slate-900">Salary preference</div>
                        <div className="mt-1 text-slate-600">Choose 30 if salary isn’t a priority. Choose 50 if unsure. Choose 80 if salary is very important.</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </form>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="text-sm font-semibold text-slate-900">Vision & Experience</div>
              <div className="mt-2 text-xs text-slate-600">
                Our AI uses your career goal + experience level to weight industries and roles.
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                AI INSIGHT TIP
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Live Analysis Confidence</div>
                  <div className="mt-1 text-xs text-slate-600">Profile completeness signal</div>
                </div>
                <div className="text-sm font-semibold text-slate-900">{liveAnalysisConfidence}%</div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${liveAnalysisConfidence}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-slate-600">
                Better skill + interest detail improves match clarity and roadmap precision.
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500">COMMUNITY BENCHMARKS</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-slate-600">Avg skills listed</div>
                  <div className="font-semibold text-slate-900">12+</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-slate-600">Target salary (mid-level)</div>
                  <div className="font-semibold text-slate-900">$45k+</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
