import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useBankBalance } from '../hooks/useBankBalance.js'
import { useRecurring } from '../hooks/useRecurring.js'
import { setBankBalance } from '../lib/bankStore.js'
import { forecastBalance, upcomingRecurring } from '../lib/forecast.js'
import { getCategory } from '../lib/categories.js'

function upcomingLabel(r) {
  if (r.merchantName) return r.merchantName
  if (r.type === 'income') return 'Income'
  return getCategory(r.categoryId).label
}

export default function BankBalanceCard() {
  const { user } = useAuth()
  const { balance } = useBankBalance()
  const { recurring } = useRecurring()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showUpcoming, setShowUpcoming] = useState(false)

  function startEdit() {
    setDraft(balance != null ? String(balance) : '')
    setEditing(true)
  }

  async function commit() {
    setEditing(false)
    const v = parseFloat(draft)
    if (!Number.isNaN(v)) await setBankBalance(user.uid, Math.round(v * 100) / 100)
  }

  const isLow = balance != null && balance < 0
  const upcoming = upcomingRecurring(recurring)
  const forecast = forecastBalance(balance, recurring)
  const showForecast = !editing && balance != null && upcoming.length > 0

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="section-label" style={{ margin: 0 }}>Bank balance</p>
        {!editing && (
          <button
            onClick={startEdit}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, padding: 0 }}
          >
            {balance != null ? 'Update' : 'Set'}
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.6rem' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--muted)' }}>$</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            placeholder="0.00"
            style={{
              flex: 1, padding: '0.4rem 0.6rem', borderRadius: 10, fontSize: '1.2rem', fontWeight: 700,
              background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
            }}
          />
        </div>
      ) : balance != null ? (
        <p style={{
          margin: '0.4rem 0 0', fontSize: '1.9rem', fontWeight: 700, letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums', color: isLow ? 'var(--danger)' : 'var(--text)',
        }}>
          ${balance.toFixed(2)}
        </p>
      ) : (
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--subtle)' }}>
          Tap <strong>Set</strong> to track what's in your account. It updates as you log.
        </p>
      )}

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
