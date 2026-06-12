import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function AuthGate({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null
  if (user === null) return <Navigate to="/login" replace />
  return children
}
