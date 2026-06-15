import { useMemo, useState } from 'react'
import { useExpenses } from '../hooks/useExpenses.js'
import { useRecurring } from '../hooks/useRecurring.js'
import { balanceDelta } from '../lib/expense.js'
import { forecastBalance, upcomingRecurring } from '../lib/forecast.js'
import { getCategory } from '../lib/categories.js'

function upcomingLabel(r) {
  if (r.merchantName) return r.merchantName
  if (r.type === 'income') return 'Income'
  return getCategory(r.categoryId).label
}

export default function BankBalanceCard() {
  const { expenses } = useExpenses()
  const { recurring } = useRecurring()
  const [showUpcoming, setShowUpcoming] = useState(false)

  // Balance is purely calculated: total income minus total expenses you've
  // logged. It is never edited directly — it only moves as entries are logged.
  const balance = useMemo(
    () => expenses.reduce((sum, e) => sum + balanceDelta(e.type, e.amount), 0),
    [expenses],
  )

  const isLow = balance < 0
  const upcoming = upcomingRecurring(recurring)
  const forecast = forecastBalance(balance, recurring)
  const showForecast = upcoming.length > 0

  return (
    <div className="card">
      <p className="section-label" style={{ margin: 0 }}>Bank balance</p>

      <p style={{
        margin: '0.4rem 0 0', fontSize: '1.9rem', fontWeight: 700, letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums', color: isLow ? 'var(--danger)' : 'var(--text)',
      }}>
        ${balance.toFixed(2)}
      </p>
      <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: 'var(--subtle)' }}>
        Calculated from your logged income and expenses
      </p>

      {showForecast && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.65rem' }}>
          <button
            onClick={() => setShowUpcoming((s) => !s)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span style={{ fontSize: '0.78rem', color: 'var(--subtle)' }}>
              Projected end of month {showUpcoming ? '▾' : '▸'}
            </span>
            <span style={{
              fontSize: '1rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: forecast < 0 ? 'var(--danger)' : 'var(--text)',
            }}>
              ${forecast.toFixed(2)}
            </span>
          </button>

          {showUpcoming && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
              {upcoming.map((r) => {
                const income = r.type === 'income'
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ fontSize: '0.95rem' }}>{income ? '💰' : getCategory(r.categoryId).emoji}</span>
                    <span style={{ flex: 1, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {upcomingLabel(r)}
                    </span>
                    <span style={{ color: 'var(--subtle)', fontSize: '0.72rem' }}>day {r.dayOfMonth}</span>
                    <span style={{
                      fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                      color: income ? 'var(--accent)' : 'var(--text)',
                    }}>
                      {income ? '+' : '−'}${Number(r.amount).toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
