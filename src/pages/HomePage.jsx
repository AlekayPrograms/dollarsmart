import { Link } from 'react-router-dom'
import { useExpenses } from '../hooks/useExpenses.js'
import { useSharedExpenses } from '../hooks/useSharedExpenses.js'
import { useHousehold } from '../hooks/useHousehold.js'
import { currentStreak } from '../lib/streak.js'
import { sumByPool } from '../lib/budget.js'
import StreakBadge from '../components/StreakBadge.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import PendingTransactionBanner from '../components/PendingTransactionBanner.jsx'
import ReconnectBanner from '../components/ReconnectBanner.jsx'

export default function HomePage() {
  const { expenses } = useExpenses()
  const { expenses: shared } = useSharedExpenses()
  const { household } = useHousehold()

  // Streak is personal (my own logging); the shared pool spans both partners.
  const streak = currentStreak(expenses.map((e) => e.date))
  const pools = sumByPool(shared)
  const sharedSpent = pools.shared ?? 0
  const sharedTarget = Object.values(household?.sharedTargets ?? {}).reduce((a, b) => a + (Number(b) || 0), 0)

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '1.25rem', gap: '0.75rem' }}>
      <h1 style={{ margin: 0 }}>💸 DollarSmart</h1>

      <StreakBadge streak={streak} />

      <PendingTransactionBanner />

      <ReconnectBanner />

      {sharedTarget > 0 && (
        <div style={{ width: '100%', maxWidth: 420 }}>
          <ProgressBar spent={sharedSpent} target={sharedTarget} label="Shared pool this month" />
        </div>
      )}

      <Link to="/log" className="btn btn-primary" style={{ textDecoration: 'none' }}>
        + Log
      </Link>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/expenses" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Expenses
        </Link>
        <Link to="/settings" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Settings
        </Link>
      </div>
    </div>
  )
}
