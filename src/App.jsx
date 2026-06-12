import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGate from './components/AuthGate.jsx'
import HouseholdGate from './components/HouseholdGate.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import HomePage from './pages/HomePage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={
          <AuthGate>
            <OnboardingPage />
          </AuthGate>
        }
      />
      <Route
        path="/*"
        element={
          <AuthGate>
            <HouseholdGate>
              <HomePage />
            </HouseholdGate>
          </AuthGate>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
