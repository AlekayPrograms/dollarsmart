import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AuthGate from './components/AuthGate.jsx'
import HouseholdGate from './components/HouseholdGate.jsx'
import BottomNav from './components/BottomNav.jsx'
import RecurringRunner from './components/RecurringRunner.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LogPage from './pages/LogPage.jsx'
import ExpensesPage from './pages/ExpensesPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

const NO_NAV = ['/login', '/onboarding']

function App() {
  const location = useLocation()
  const showNav = !NO_NAV.includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<AuthGate><OnboardingPage /></AuthGate>} />
        <Route path="/log" element={<AuthGate><HouseholdGate><LogPage /></HouseholdGate></AuthGate>} />
        <Route path="/expenses" element={<AuthGate><HouseholdGate><ExpensesPage /></HouseholdGate></AuthGate>} />
        <Route path="/insights" element={<AuthGate><HouseholdGate><InsightsPage /></HouseholdGate></AuthGate>} />
        <Route path="/settings" element={<AuthGate><HouseholdGate><SettingsPage /></HouseholdGate></AuthGate>} />
        <Route path="/*" element={<AuthGate><HouseholdGate><HomePage /></HouseholdGate></AuthGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
      <RecurringRunner />
    </>
  )
}

export default App
