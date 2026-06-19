import { Link } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useMonthlyTargets } from '../hooks/useMonthlyTargets.js'
import { sumByCategory, budgetProgress } from '../lib/budget.js'
import { CATEGORIES } from '../lib/categories.js'
import ProgressBar from '../components/ProgressBar.jsx'
import PendingTransactionBanner from '../components/PendingTransactionBanner.jsx'
import ReconnectBanner from '../components/ReconnectBanner.jsx'
import BankBalanceCard from '../components/BankBalanceCard.jsx'

function toMs(date) {
  if (!date) return 0
  if (date.toDate) return date.toDate().getTime()
  return new Date(date).getTime()
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function HomePage() {
  const { expenses } = useExpenses()
  const { personalTargets } = useMonthlyTargets()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthName = MONTH_NAMES[now.getMonth()]

  const myThisMonth = expenses.filter((e) => toMs(e.date) >= monthStart)
  const spentByCategory = sumByCategory(myThisMonth)

  const budgetRows = CATEGORIES.filter((c) =>
    (spentByCategory[c.id] ?? 0) > 0 || (personalTargets[c.id] ?? 0) > 0
  )

  return (
    <PageWrapper className="page-center" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
            {monthName}
          </p>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>DollarSmart</h1>
        </div>
        <Link to="/log" className="btn btn-primary" style={{ textDecoration: 'none', padding: '0.6rem 1.2rem' }}>
          + Log
        </Link>
      </div>

      <PendingTransactionBanner />
      <ReconnectBanner />

      <BankBalanceCard />

      {budgetRows.length > 0 && (
        <div className="card">
          <p className="section-label">Personal Budget</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {budgetRows.map((cat) => {
              const spent = spentByCategory[cat.id] ?? 0
              const target = personalTargets[cat.id] ?? 0
              const { status } = budgetProgress(spent, target)
              return (
                <div key={cat.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>{cat.emoji}</span>
                      <span style={{ color: 'var(--muted)' }}>{cat.label}</span>
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      fontVariantNumeric: 'tabular-nums',
                      color: status === 'over' ? 'var(--danger)' : status === 'warn' ? 'var(--warn)' : 'var(--subtle)',
                    }}>
                      ${spent.toFixed(0)}{target > 0 ? ` / $${target.toFixed(0)}` : ''}
                    </span>
                  </div>
                  <ProgressBar spent={spent} target={target} color={target > 0 ? undefined : cat.color} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {budgetRows.length === 0 && (
        <div style={{ color: 'var(--subtle)', fontSize: '0.875rem', textAlign: 'center', paddingTop: '2rem' }}>
          <p style={{ margin: 0 }}>No expenses or targets yet.</p>
          <p style={{ margin: '0.25rem 0 0' }}>Tap <strong>+ Log</strong> to get started.</p>
        </div>
      )}
    </PageWrapper>
  )
}
