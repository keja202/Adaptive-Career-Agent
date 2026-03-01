import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ProfileSetup from './pages/ProfileSetup'
import ProfileGoals from './pages/ProfileGoals'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Roadmap from './pages/Roadmap'
import CareerProfile from './pages/CareerProfile'
import Comparison from './pages/Comparison'
import Roadmaps from './pages/Roadmaps'
import SwotRedirect from './pages/SwotRedirect'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/profile" element={<ProfileSetup />} />
          <Route path="/profile-goals" element={<ProfileGoals />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/roadmaps" element={<Roadmaps />} />
          <Route path="/swot" element={<SwotRedirect />} />
          <Route path="/roadmap/:careerId" element={<Roadmap />} />
          <Route path="/career/:careerId" element={<CareerProfile />} />
          <Route path="/compare" element={<Comparison />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
