import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function Pill({ text, tone }) {
  const toneClasses =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : tone === 'red'
        ? 'bg-red-50 text-red-700 border-red-100'
        : tone === 'purple'
          ? 'bg-purple-50 text-purple-700 border-purple-100'
          : 'bg-slate-100 text-slate-700 border-slate-200'

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses}`}>{text}</span>
}

export default function Admin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ total_users: 0, total_goals: 0, system_health: 'OK' })
  const [users, setUsers] = useState([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const me = await api.get('/me')
        if (String(me?.data?.role || '') !== 'ADMIN') {
          navigate('/dashboard', { replace: true })
          return
        }
        const [s, u] = await Promise.all([api.get('/admin/stats'), api.get('/admin/users')])
        setStats(s?.data || { total_users: 0, total_goals: 0, system_health: 'OK' })
        setUsers(Array.isArray(u?.data) ? u.data : [])
      } catch (e) {
        setError(e?.response?.data?.detail || 'Failed to load admin data')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [navigate])

  const toggleStatus = async (row) => {
    const next = row?.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    try {
      const res = await api.patch(`/admin/users/${row.id}`, { status: next })
      setUsers((prev) => prev.map((x) => (x.id === row.id ? res.data : x)))
    } catch {
      // ignore
    }
  }

  const deleteUser = async (row) => {
    if (!row?.id) return
    const ok = window.confirm(`Delete user ${row.email}? This removes their goals and profile data too.`)
    if (!ok) return
    try {
      await api.delete(`/admin/users/${row.id}`)
      setUsers((prev) => prev.filter((x) => x.id !== row.id))
    } catch {
      // ignore
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 h-fit">
          <div className="text-sm font-semibold text-slate-900">Admin Portal</div>
          <div className="mt-4 space-y-1">
            <Link to="/admin" className="block rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
              Admin
            </Link>
            <Link to="/dashboard" className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              Back to App
            </Link>
          </div>
        </aside>

        <main>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold text-slate-900">Dashboard</div>
              <div className="mt-1 text-sm text-slate-600">User management and system overview.</div>
            </div>
            <div className="flex items-center gap-2">
              <Pill text={stats?.system_health || 'OK'} tone="green" />
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 text-slate-600">Loading…</div>
          ) : error ? (
            <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-6 text-sm text-red-600">{error}</div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StatCard label="Total Users" value={stats?.total_users ?? 0} />
                <StatCard label="Total Saved Goals" value={stats?.total_goals ?? 0} />
                <StatCard label="System Health" value={stats?.system_health || 'OK'} />
              </div>

              <div className="mt-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="p-6 border-b border-slate-200">
                  <div className="text-base font-semibold text-slate-900">User Management</div>
                  <div className="mt-1 text-sm text-slate-600">Manage users created in this platform.</div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-3 text-left font-semibold">USER</th>
                        <th className="px-6 py-3 text-left font-semibold">ROLE</th>
                        <th className="px-6 py-3 text-left font-semibold">SUBSCRIPTION</th>
                        <th className="px-6 py-3 text-left font-semibold">STATUS</th>
                        <th className="px-6 py-3 text-left font-semibold">JOINED</th>
                        <th className="px-6 py-3 text-right font-semibold">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Pill text={u.role} tone={u.role === 'ADMIN' ? 'red' : 'slate'} />
                          </td>
                          <td className="px-6 py-4">
                            <Pill text={u.subscription || 'FREE'} tone={u.subscription === 'ENTERPRISE' ? 'purple' : 'slate'} />
                          </td>
                          <td className="px-6 py-4">
                            <Pill text={u.status} tone={u.status === 'ACTIVE' ? 'green' : 'red'} />
                          </td>
                          <td className="px-6 py-4 text-slate-600">{u.joined_at || '—'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => toggleStatus(u)}
                                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteUser(u)}
                                className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </motion.div>
  )
}
