import { Link } from 'react-router-dom'
import PageWrapper from '../components/PageWrapper.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useMonthlyTargets } from '../hooks/useMonthlyTargets.js'
import { sumByCategory, budgetProgress, leftToSpend } from '../lib/budget.js'
import { CATEGORIES } from '../lib/categories.js'
import ProgressBar from '../components/ProgressBar.jsx'
import PendingTransactionBanner from '../components/PendingTransactionBanner.jsx'
import ReconnectBanner from '../components/ReconnectBanner.jsx'
import BankBalanceCard from '../components/BankBalanceCard.jsx'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

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

  const hero = leftToSpend(spentByCategory, personalTargets)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - now.getDate()
  const dailyPace = hero && daysLeft > 0 ? hero.left / daysLeft : null
  const expectedDailyRate = hero ? hero.total / daysInMonth : null
  const onPace = dailyPace !== null && expectedDailyRate !== null && dailyPace >= expectedDailyRate * 0.85

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

      {hero && (
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)', padding: '1.125rem 1.25rem',
          boxShadow: 'var(--shadow-card)',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>
            Left to spend
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <AnimatedNumber
              value={hero.left}
              prefix="$"
              decimals={0}
              style={{
                fontSize: '3rem', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1,
                color: hero.left < 0 ? 'var(--danger)' : '#ffffff',
              }}
            />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--subtle)', paddingBottom: 4 }}>
              / ${hero.total.toFixed(0)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {hero.left >= 0 ? (
              <span style={{
                fontSize: 'var(--text-xs)', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: 'rgba(16,185,129,.15)', color: 'var(--accent)',
              }}>
                {onPace ? '✓ On pace' : '⚠ Spending fast'}
              </span>
            ) : (
              <span style={{
                fontSize: 'var(--text-xs)', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: 'rgba(248,113,113,.15)', color: 'var(--danger)',
              }}>
                ⚠ Over budget
              </span>
            )}
            {daysLeft > 0 && dailyPace !== null && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--subtle)' }}>
                ${Math.max(dailyPace, 0).toFixed(0)}/day · {daysLeft} days left
              </span>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <ProgressBar spent={hero.spent} target={hero.total} />
          </div>
        </div>
      )}

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

      {!hero && budgetRows.length === 0 && (
        <EmptyState
          icon="🎯"
          heading="Set a monthly budget"
          sub="Go to Settings → Monthly targets to get started"
        />
      )}
    </PageWrapper>
  )
}
