import { lazy, Suspense } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AuthGate from './components/AuthGate.jsx'
import HouseholdGate from './components/HouseholdGate.jsx'
import BottomNav from './components/BottomNav.jsx'
import RecurringRunner from './components/RecurringRunner.jsx'

// Code-split each page into its own chunk so the initial load is small. Heavy
// deps (Plaid in Settings, charts in Insights) load only when those pages open.
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.jsx'))
const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const LogPage = lazy(() => import('./pages/LogPage.jsx'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage.jsx'))
const InsightsPage = lazy(() => import('./pages/InsightsPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))

const NO_NAV = ['/login', '/onboarding']

function PageFallback() {
  return (
    <div className="page-center" style={{ justifyContent: 'center', color: 'var(--subtle)' }}>
      Loading…
    </div>
  )
}

function App() {
  const location = useLocation()
  const showNav = !NO_NAV.includes(location.pathname)

  return (
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<PageFallback />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<AuthGate><OnboardingPage /></AuthGate>} />
            <Route path="/log" element={<AuthGate><HouseholdGate><LogPage /></HouseholdGate></AuthGate>} />
            <Route path="/expenses" element={<AuthGate><HouseholdGate><ExpensesPage /></HouseholdGate></AuthGate>} />
            <Route path="/insights" element={<AuthGate><HouseholdGate><InsightsPage /></HouseholdGate></AuthGate>} />
            <Route path="/settings" element={<AuthGate><HouseholdGate><SettingsPage /></HouseholdGate></AuthGate>} />
            <Route path="/*" element={<AuthGate><HouseholdGate><HomePage /></HouseholdGate></AuthGate>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      {showNav && <BottomNav />}
      <RecurringRunner />
    </MotionConfig>
  )
}

export default App
