import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

export default function Logout() {
  useEffect(() => {
    localStorage.removeItem('access_token')
  }, [])

  return <Navigate to="/login" replace />
}
