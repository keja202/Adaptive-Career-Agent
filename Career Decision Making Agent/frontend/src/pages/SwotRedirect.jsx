import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

export default function SwotRedirect() {
  const navigate = useNavigate()

  const analysis = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('analysis') || '{}')
    } catch {
      return {}
    }
  }, [])

  const bestId = analysis?.top_matches?.[0]?.id

  useEffect(() => {
    if (bestId) navigate(`/career/${bestId}`, { replace: true })
  }, [bestId, navigate])

  if (!bestId) return <Navigate to="/dashboard" replace />

  return null
}
