import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

function StatBar({ label, value }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)))
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>{label}</div>
        <div>{v.toFixed(1)}%</div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-blue-600" style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

function SWOTCard({ title, items }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {(items || []).slice(0, 6).map((x, i) => (
          <div key={i} className="text-slate-700">
            {x}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CareerProfile() {
  const { careerId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const analysis = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('analysis') || '{}')
    } catch {
      return {}
    }
  }, [])

  const profile = analysis?.profile

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        if (!careerId) throw new Error('Missing career id')
        if (!profile) throw new Error('No profile found. Run analysis first.')
        const res = await api.post(`/career/${careerId}`, profile)
        setData(res?.data || null)
      } catch (err) {
        setError(err?.response?.data?.detail || err?.message || 'Failed to load career profile')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [careerId, profile])

  const stats = data?.stats
  const swot = data?.swot

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">SWOT Analysis</div>
            <div className="mt-1 text-sm text-slate-600">{data?.career_title || careerId || '—'}</div>
          </div>
          <Link className="text-sm text-blue-600 hover:text-blue-700 font-semibold" to="/dashboard">
            Back to dashboard
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 text-slate-600">Loading…</div>
        ) : error ? (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 text-red-600 text-sm">{error}</div>
        ) : (
          <div className="mt-6 rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
            {data?.narrative ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <div className="text-sm font-semibold text-slate-900">Career narrative</div>
                <div className="mt-2 text-sm text-slate-700 whitespace-pre-line">{data.narrative}</div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <SWOTCard title="Strengths" items={swot?.strengths} />
              <SWOTCard title="Weaknesses" items={swot?.weaknesses} />
              <SWOTCard title="Opportunities" items={swot?.opportunities} />
              <SWOTCard title="Threats" items={swot?.threats} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Stats</div>
                <div className="mt-4 space-y-3">
                  <StatBar label="Growth" value={stats?.growth_rate} />
                  <StatBar label="Stability" value={stats?.stability} />
                  <StatBar label="Automation safety" value={100 - (stats?.automation_risk || 0)} />
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Salary range (approx)</div>
                  <div className="mt-2 text-sm text-slate-900 font-semibold">
                    ${stats?.salary_low?.toLocaleString?.() ?? '—'} – ${stats?.salary_high?.toLocaleString?.() ?? '—'}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Explainability</div>
                <div className="mt-3 text-sm text-slate-700">
                  {(data?.explainability?.reasoning_points || []).slice(0, 4).map((x, i) => (
                    <div key={i} className="mt-1">
                      {x}
                    </div>
                  ))}
                </div>
                {data?.explainability?.notes ? (
                  <div className="mt-3 text-xs text-slate-500">{data?.explainability?.notes}</div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
