import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Accordion from '../components/Accordion'
import api from '../services/api'

export default function Roadmap() {
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

  const storedProfile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('profile') || '{}')
    } catch {
      return {}
    }
  }, [])

  const profile = storedProfile?.goal ? storedProfile : analysis?.profile

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        if (!careerId) throw new Error('Missing career id')
        if (!profile) throw new Error('No profile found. Run analysis first.')
        const res = await api.post(`/roadmap/${careerId}`, profile)
        setData(res?.data || null)
      } catch (err) {
        setError(err?.response?.data?.detail || err?.message || 'Failed to load roadmap')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [careerId, profile])

  const gap = data?.gap
  const timeline = data?.timeline || []
  const projects = data?.project_suggestions || []
  const resources = data?.learning_resources || []

  const onDownloadPdf = async () => {
    try {
      if (!careerId) throw new Error('Missing career id')
      if (!profile) throw new Error('No profile found. Run analysis first.')
      const res = await api.post('/roadmap/pdf', { career_id: careerId, profile }, {
        responseType: 'arraybuffer',
        headers: {
          Accept: 'application/pdf'
        }
      })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `roadmap_${careerId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      const normalizeDetail = (detail) => {
        if (!detail) return null
        if (typeof detail === 'string') return detail
        if (typeof detail?.message === 'string') {
          const errors = Array.isArray(detail?.errors) ? detail.errors : []
          const first = errors
            .map((x) => {
              const loc = Array.isArray(x?.loc) ? x.loc.join('.') : ''
              const msg = x?.msg || x?.message || ''
              return [loc, msg].filter(Boolean).join(': ')
            })
            .filter(Boolean)
            .slice(0, 3)
            .join(' | ')
          return first ? `${detail.message} — ${first}` : detail.message
        }
        try {
          return JSON.stringify(detail)
        } catch {
          return String(detail)
        }
      }

      const maybeArrayBuffer = e?.response?.data
      if (maybeArrayBuffer && maybeArrayBuffer instanceof ArrayBuffer) {
        try {
          const txt = new TextDecoder().decode(maybeArrayBuffer)
          const json = JSON.parse(txt)
          setError(normalizeDetail(json?.detail) || 'Failed to download PDF')
          return
        } catch {
          // fall through
        }
      }
      setError(
        normalizeDetail(e?.response?.data?.detail) ||
          normalizeDetail(e?.response?.data) ||
          e?.message ||
          'Failed to download PDF'
      )
    }
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">Roadmap</div>
            <div className="mt-1 text-sm text-slate-600">
              Career: <span className="font-semibold text-slate-900">{data?.career_title || careerId || '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDownloadPdf}
              className="text-sm rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition px-3 py-2 font-semibold text-slate-700"
            >
              Download PDF
            </button>
            <Link className="text-sm text-blue-600 hover:text-blue-700 font-semibold" to="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 text-slate-600">Loading…</div>
        ) : error ? (
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6">
            <div className="text-red-600 text-sm">{error}</div>
            <div className="mt-3 text-slate-600 text-sm">
              If you haven’t analyzed yet, go to{' '}
              <Link className="text-blue-600 hover:text-blue-700 font-semibold" to="/profile">
                Profile setup
              </Link>
              .
            </div>
          </div>
        ) : (
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {data?.narrative ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                  <div className="text-sm font-semibold text-slate-900">Roadmap narrative</div>
                  <div className="mt-2 text-sm text-slate-700 whitespace-pre-line">{data.narrative}</div>
                </div>
              ) : null}

                <Accordion
                  title="Gap-based analysis"
                  subtitle={`Gap: ${gap?.gap_percent ?? '—'}% • Experience: ${data?.experience_level || '—'}`}
                  defaultOpen
                >
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <div className="text-xs text-slate-500">You have</div>
                      <div className="mt-2 text-sm text-slate-700">
                        {(gap?.have || []).slice(0, 12).join(', ') || '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <div className="text-xs text-slate-500">You need</div>
                      <div className="mt-2 text-sm text-slate-700">
                        {(gap?.need || []).slice(0, 12).join(', ') || '—'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <div className="text-xs text-slate-500">Missing</div>
                      <div className="mt-2 text-sm text-slate-700">
                        {(gap?.missing || []).slice(0, 12).join(', ') || '—'}
                      </div>
                    </div>
                  </div>
                </Accordion>

                <Accordion title="Timeline plan (6 months)" subtitle="Phase-by-phase focus + projects" defaultOpen>
                  <div className="space-y-3">
                    {timeline.map((p, idx) => (
                      <div key={`${p?.title}-${idx}`} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">{p?.title || '—'}</div>
                          <div className="text-xs text-slate-500">{p?.months || ''}</div>
                        </div>
                        <div className="mt-3 grid md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-slate-500">Focus</div>
                            <div className="mt-1 text-sm text-slate-700">{(p?.focus || []).join(' • ') || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Projects</div>
                            <div className="mt-1 text-sm text-slate-700">{(p?.projects || []).join(' • ') || '—'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Accordion>

                <Accordion title="Project suggestions" subtitle="Portfolio-ready ideas">
                  <div className="space-y-3">
                    {projects.map((p, idx) => (
                      <div key={`${p?.title}-${idx}`} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">{p?.title || '—'}</div>
                          <div className="text-xs text-slate-500">{p?.difficulty || '—'}</div>
                        </div>
                        <div className="mt-2 text-sm text-slate-700">{(p?.outcomes || []).join(' • ') || '—'}</div>
                      </div>
                    ))}
                  </div>
                </Accordion>
              </div>

              <div className="space-y-4">
                <Accordion title="Learning resources" subtitle="Courses • tools • docs" defaultOpen>
                  <div className="space-y-2">
                    {resources.map((r, idx) => (
                      <a
                        key={`${r?.title}-${idx}`}
                        href={r?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl bg-white border border-slate-200 p-4 hover:bg-slate-50 transition"
                      >
                        <div className="text-sm font-semibold text-slate-900">{r?.title || '—'}</div>
                        <div className="mt-1 text-xs text-slate-500">{r?.kind || '—'}</div>
                        <div className="mt-2 text-xs text-slate-500 break-all">{r?.url || ''}</div>
                      </a>
                    ))}
                  </div>
                </Accordion>

                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                  <div className="text-sm font-semibold text-slate-900">Explainability</div>
                  <div className="mt-2 text-xs text-slate-500">Why this roadmap looks like this</div>
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
