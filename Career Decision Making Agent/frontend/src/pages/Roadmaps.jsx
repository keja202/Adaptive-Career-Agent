import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Roadmaps() {
  const navigate = useNavigate()

  const analysis = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('analysis') || '{}')
    } catch {
      return {}
    }
  }, [])

  const matches = analysis?.top_matches || []

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-slate-900">Roadmaps</div>
          <div className="mt-1 text-sm text-slate-600">Pick a role to view the personalized roadmap.</div>
        </div>
        <Link className="text-sm text-blue-600 hover:text-blue-700 font-semibold" to="/dashboard">
          Back to dashboard
        </Link>
      </div>

      {!matches.length ? (
        <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 text-slate-600">
          No analysis found. Go to{' '}
          <Link className="text-blue-600 hover:text-blue-700 font-semibold" to="/profile">
            Profile setup
          </Link>
          .
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6"
        >
          <div className="rounded-3xl bg-white p-6 md:p-8 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">Recommended roles (agent-ranked)</div>
                <div className="mt-1 text-sm text-slate-600">Tap a card to open the roadmap.</div>
              </div>
              <div className="text-xs text-slate-500">Showing {Math.min(matches.length, 6)} of {matches.length}</div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {matches.slice(0, 6).map((m) => {
                const score = Number(m?.breakdown?.match_percent ?? 0)
                const pct = Math.max(0, Math.min(100, score))
                return (
                  <button
                    key={m?.id}
                    type="button"
                    onClick={() => navigate(`/roadmap/${m?.id}`)}
                    className="text-left rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white transition p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{m?.title || '—'}</div>
                        <div className="mt-1 text-xs text-slate-500">Dominant signal: {m?.dominant_factor || '—'}</div>
                      </div>
                      <div className="text-xs font-semibold text-slate-900">{pct.toFixed(0)}%</div>
                    </div>

                    <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="mt-3 text-xs text-slate-500">Tap to view roadmap</div>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
