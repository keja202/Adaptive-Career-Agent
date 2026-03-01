import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function GoalCard({ goal, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl bg-white border border-slate-200 shadow-sm p-6 hover:bg-slate-50 transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-slate-900">{goal?.goal_title || 'Career goal'}</div>
          <div className="mt-2 text-xs text-slate-600 line-clamp-2">{goal?.explanation || '—'}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Match</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{Number(goal?.match_percent || 0).toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, Number(goal?.match_percent || 0)))}%` }} />
      </div>
    </button>
  )
}

export default function ProfileGoals() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [goals, setGoals] = useState([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/me/goals')
        setGoals(Array.isArray(res?.data) ? res.data : [])
      } catch (e) {
        setGoals([])
        setError(e?.response?.data?.detail || 'Failed to load goals')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const onAdd = () => {
    localStorage.setItem('onboarding_mode', 'add_goal')
    navigate('/profile', { replace: false })
  }

  const openGoal = async (goalId) => {
    try {
      const res = await api.get(`/me/goals/${goalId}`)
      const detail = res?.data
      if (detail?.profile) localStorage.setItem('profile', JSON.stringify(detail.profile))
      if (detail?.analysis) localStorage.setItem('analysis', JSON.stringify(detail.analysis))
      localStorage.setItem('active_goal_id', String(goalId))
      navigate('/dashboard', { replace: true })
    } catch {
      // ignore; handled by UI state
    }
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Profile</div>
            <div className="mt-1 text-sm text-slate-600">Your saved career goals. Switch anytime.</div>
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 transition px-4 text-sm font-semibold text-white"
          >
            Add
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 text-slate-600">Loading goals…</div>
        ) : error ? (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 text-sm text-red-600">{error}</div>
        ) : goals.length ? (
          <div className="mt-6 grid gap-4">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onClick={() => openGoal(g.id)} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
            <div className="text-sm font-semibold text-slate-900">No goals yet</div>
            <div className="mt-2 text-sm text-slate-600">Click Add to create your first career goal.</div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
