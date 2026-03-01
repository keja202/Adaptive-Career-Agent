import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import AuthShell from '../components/AuthShell'

function Rule({ ok, text }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-600" aria-hidden="true">
          <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-400" aria-hidden="true">
          <path
            d="M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className={ok ? 'text-emerald-700' : 'text-slate-600'}>{text}</span>
    </div>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pwRules = useMemo(() => {
    const v = password || ''
    return {
      len: v.length >= 8,
      upper: /[A-Z]/.test(v),
      lower: /[a-z]/.test(v),
      num: /[0-9]/.test(v),
      special: /[^A-Za-z0-9]/.test(v),
    }
  }, [password])

  const pwScore = useMemo(() => Object.values(pwRules).filter(Boolean).length, [pwRules])
  const pwStrength = useMemo(() => {
    if (!password) return { label: '', color: 'bg-slate-200', w: 'w-0' }
    if (pwScore <= 2) return { label: 'WEAK', color: 'bg-red-500', w: 'w-1/4' }
    if (pwScore === 3) return { label: 'FAIR', color: 'bg-amber-500', w: 'w-2/4' }
    if (pwScore === 4) return { label: 'GOOD', color: 'bg-blue-600', w: 'w-3/4' }
    return { label: 'STRONG', color: 'bg-emerald-600', w: 'w-full' }
  }, [password, pwScore])

  const canSubmit = useMemo(() => email && password.length >= 8 && password.length <= 72, [email, password])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/signup', { email, password })
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Create Account" subtitle="Build your AI career identity in minutes.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-slate-600">Institutional Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-1 w-full rounded-xl bg-white border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="alex@university.edu"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Password</label>
          <div className="relative mt-1">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 pr-11 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="8–72 characters"
              maxLength={72}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M3 3l18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10.6 10.6a2 2 0 0 0 2.83 2.83"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7-0.52 1.16-1.27 2.23-2.2 3.16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.23 6.23C4.24 7.58 2.77 9.53 2 12c1.73 3.89 6 7 10 7 1.55 0 3.03-0.3 4.38-0.84"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-2">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-2 ${pwStrength.color} ${pwStrength.w}`} />
              </div>
              <div className={`text-xs font-semibold ${pwStrength.label ? 'text-slate-600' : 'text-transparent'}`}>
                {pwStrength.label || 'STRONG'}
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs font-semibold text-slate-700">Password must contain:</div>
              <div className="mt-2 space-y-1 text-sm">
                <Rule ok={pwRules.len} text="At least 8 characters" />
                <Rule ok={pwRules.upper} text="One uppercase letter (A–Z)" />
                <Rule ok={pwRules.lower} text="One lowercase letter (a–z)" />
                <Rule ok={pwRules.num} text="One number (0–9)" />
                <Rule ok={pwRules.special} text="One special character (!@#$%^&*)" />
              </div>
            </div>
          </div>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <button
          disabled={!canSubmit || loading}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition px-3 py-2 font-semibold text-white"
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
