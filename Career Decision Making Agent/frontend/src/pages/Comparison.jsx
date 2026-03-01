import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import SearchableGroupedSelect from '../components/SearchableGroupedSelect'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

function MetricRow({ label, a, b, suffix = '%' }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="text-slate-500">{label}</div>
      <div className="text-slate-900">{a ?? '—'}{a === 0 ? suffix : a ? suffix : ''}</div>
      <div className="text-slate-900">{b ?? '—'}{b === 0 ? suffix : b ? suffix : ''}</div>
    </div>
  )
}

export default function Comparison() {
  const analysis = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('analysis') || '{}')
    } catch {
      return {}
    }
  }, [])

  const storedProfile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('profile') || '{}')
    } catch {
      return {}
    }
  }, [])

  const profile = storedProfile?.goal ? storedProfile : analysis?.profile
  const [careerOptions, setCareerOptions] = useState([])
  const [careerA, setCareerA] = useState('')
  const [careerB, setCareerB] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get('/careers')
        const opts = res?.data || []
        setCareerOptions(opts)
        if (!careerA && opts?.[0]?.id) setCareerA(opts[0].id)
        if (!careerB && (opts?.[1]?.id || opts?.[0]?.id)) setCareerB(opts?.[1]?.id || opts?.[0]?.id)
      } catch {
        setCareerOptions([])
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canCompare = Boolean(profile) && careerA && careerB && careerA !== careerB

  const onCompare = async () => {
    if (!canCompare) return
    setLoading(true)
    setError('')
    try {
      const payload = { career_a_id: careerA, career_b_id: careerB, profile }
      const res = await api.post('/compare', payload)
      setData(res?.data || null)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  const a = data?.career_a
  const b = data?.career_b

  const radarData = useMemo(() => {
    const ar = a?.radar
    const br = b?.radar
    if (!ar || !br) return []
    return [
      { metric: 'Skill', a: ar.skill_match ?? 0, b: br.skill_match ?? 0 },
      { metric: 'Growth', a: ar.growth ?? 0, b: br.growth ?? 0 },
      { metric: 'Salary', a: ar.salary ?? 0, b: br.salary ?? 0 },
      { metric: 'Stability', a: ar.stability ?? 0, b: br.stability ?? 0 },
      { metric: 'Auto safety', a: 100 - (ar.automation_risk ?? 0), b: 100 - (br.automation_risk ?? 0) }
    ]
  }, [a, b])

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Comparison</div>
            <div className="mt-1 text-sm text-slate-600">Pick two paths and see the weighted differences.</div>
          </div>
          <Link className="text-sm text-blue-600 hover:text-blue-700 font-semibold" to="/dashboard">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs text-slate-600">Career A</label>
              <div className="mt-1">
                <SearchableGroupedSelect
                  options={careerOptions.length ? careerOptions : [{ id: 'loading', title: 'Loading…', category: 'General' }]}
                  value={careerA}
                  onChange={(v) => setCareerA(v)}
                  placeholder="Select career"
                  getOptionLabel={(c) => c?.title}
                  getOptionValue={(c) => c?.id}
                  groupBy={(c) => c?.category || 'General'}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600">Career B</label>
              <div className="mt-1">
                <SearchableGroupedSelect
                  options={careerOptions.length ? careerOptions : [{ id: 'loading', title: 'Loading…', category: 'General' }]}
                  value={careerB}
                  onChange={(v) => setCareerB(v)}
                  placeholder="Select career"
                  getOptionLabel={(c) => c?.title}
                  getOptionValue={(c) => c?.id}
                  groupBy={(c) => c?.category || 'General'}
                />
              </div>
            </div>

            <button
              onClick={onCompare}
              disabled={!canCompare || loading}
              className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition px-3 font-semibold text-white"
            >
              {loading ? 'Comparing…' : 'Compare'}
            </button>
          </div>

          {!profile ? (
            <div className="mt-4 text-sm text-slate-600">
              No profile found. Run analysis first in{' '}
              <Link className="text-blue-600 hover:text-blue-700 font-semibold" to="/profile">
                Profile setup
              </Link>
              .
            </div>
          ) : null}

          {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
        </div>

          {data ? (
            <div className="mt-6 grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-600">Dominant advantage factor</div>
                      <div className="text-xl font-semibold text-slate-900">{data?.dominant_advantage_factor || '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Score delta (A − B)</div>
                      <div className={`text-xl font-semibold ${Number(data?.score_delta || 0) >= 0 ? 'text-blue-700' : 'text-sky-700'}`}>
                        {data?.score_delta ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                  <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                    <div />
                    <div className="font-semibold text-slate-900">{a?.title || 'Career A'}</div>
                    <div className="font-semibold text-slate-900">{b?.title || 'Career B'}</div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <MetricRow label="Match" a={a?.breakdown?.match_percent} b={b?.breakdown?.match_percent} />
                    <MetricRow label="Skill match" a={a?.breakdown?.skill_match_percent} b={b?.breakdown?.skill_match_percent} />
                    <MetricRow label="Salary fit" a={a?.breakdown?.salary_fit_percent} b={b?.breakdown?.salary_fit_percent} />
                    <MetricRow label="Growth" a={a?.breakdown?.growth_percent} b={b?.breakdown?.growth_percent} />
                    <MetricRow label="Feasibility" a={a?.feasibility} b={b?.feasibility} />
                  </div>

                  <div className="mt-4 text-xs text-slate-600">Factor deltas (weighted, A − B)</div>
                  <div className="mt-2 grid md:grid-cols-2 gap-2">
                    {Object.entries(data?.factor_deltas || {}).map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
                        <div className="text-xs text-slate-600">{k}</div>
                        <div className={`text-sm font-semibold ${Number(v) >= 0 ? 'text-blue-700' : 'text-sky-700'}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                  <div className="text-sm font-semibold text-slate-900">Radar overlay</div>
                  <div className="mt-1 text-xs text-slate-500">Compare core signals side-by-side</div>

                  <div className="mt-4 h-64">
                    {radarData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} outerRadius="70%">
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 12 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Tooltip />
                          <Radar dataKey="a" name="Career A" stroke="#2563eb" fill="rgba(37,99,235,0.18)" />
                          <Radar dataKey="b" name="Career B" stroke="#0ea5e9" fill="rgba(14,165,233,0.16)" />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data</div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
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
          ) : null}
      </motion.div>
    </div>
  )
}
