import { Navigate } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold.js'

export default function HouseholdGate({ children }) {
  const { householdId, loading } = useHousehold()
  if (loading) return null
  if (!householdId) return <Navigate to="/onboarding" replace />
  return children
}
