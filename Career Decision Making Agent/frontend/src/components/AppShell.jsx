import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'

function NavItem({ to, label }) {
  const location = useLocation()
  const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
  return (
    <Link
      to={to}
      className={
        active
          ? 'inline-flex items-center rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700'
          : 'inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }
    >
      {label}
    </Link>
  )
}

function TopNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [role, setRole] = useState(() => String(localStorage.getItem('user_role') || ''))
  const onLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_status')
    navigate('/login', { replace: true })
  }

  const hideGoalNav = location.pathname === '/profile-goals'

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const existing = localStorage.getItem('user_role')
    if (!token || existing) return
    api
      .get('/me')
      .then((res) => {
        if (res?.data?.role) {
          localStorage.setItem('user_role', String(res.data.role))
          setRole(String(res.data.role))
        }
        if (res?.data?.status) localStorage.setItem('user_status', String(res.data.status))
      })
      .catch(() => {})
  }, [])

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-semibold">
            A
          </div>
          <div className="text-sm font-semibold text-slate-900">AI Specialization Pro</div>
        </div>

        {!hideGoalNav ? (
          <div className="hidden md:flex items-center gap-1">
            <NavItem to="/dashboard" label="Dashboard" />
            <NavItem to="/roadmaps" label="Roadmaps" />
            <NavItem to="/swot" label="SWOT Analysis" />
            <NavItem to="/compare" label="Comparison" />
            {role === 'ADMIN' ? <NavItem to="/admin" label="Admin" /> : null}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <NavItem to="/profile-goals" label="Profile" />
          <button
            type="button"
            onClick={onLogout}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <div className="mt-14 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-semibold">
                A
              </div>
              <div className="text-sm font-semibold text-slate-900">AI Specialization Pro</div>
            </div>
            <div className="mt-3 text-sm text-slate-500">
              Empowering the next generation of AI specialists with data-driven career insights and personalized growth roadmaps.
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Platform</div>
            <div className="mt-3 space-y-2 text-sm">
              <Link className="block text-slate-500 hover:text-slate-900" to="/dashboard">
                Career Search
              </Link>
              <Link className="block text-slate-500 hover:text-slate-900" to="/dashboard">
                Skill Gap Analysis
              </Link>
              <Link className="block text-slate-500 hover:text-slate-900" to="/roadmaps">
                Roadmap Generator
              </Link>
              <Link className="block text-slate-500 hover:text-slate-900" to="/compare">
                Comparison
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Resources</div>
            <div className="mt-3 space-y-2 text-sm">
              <a className="block text-slate-500 hover:text-slate-900" href="#">
                AI Trends 2024
              </a>
              <a className="block text-slate-500 hover:text-slate-900" href="#">
                Learning Paths
              </a>
              <a className="block text-slate-500 hover:text-slate-900" href="#">
                Documentation
              </a>
              <a className="block text-slate-500 hover:text-slate-900" href="#">
                API Access
              </a>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Connect</div>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              Built with precision-grade AI analysis.
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© 2024. All rights reserved.</div>
          <div className="flex gap-4">
            <a className="hover:text-slate-900" href="#">
              Privacy Policy
            </a>
            <a className="hover:text-slate-900" href="#">
              Terms of Service
            </a>
            <a className="hover:text-slate-900" href="#">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AppShell() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
