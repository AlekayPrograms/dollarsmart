import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { useSharedExpenses } from '../hooks/useSharedExpenses.js'
import { useSettlements } from '../hooks/useSettlements.js'
import { computeSettleBalance, describeBalance } from '../lib/settle.js'
import { addSettlement } from '../lib/settleStore.js'
import { haptics } from '../lib/haptics.js'

/**
 * Running settle-up balance between the two partners, with a manual "Settle up"
 * button that records a reimbursement zeroing the balance. Renders nothing for a
 * solo household or when there's nothing owed either way.
 */
export default function SettleUpCard() {
  const { user } = useAuth()
  const { householdId, household } = useHousehold()
  const { expenses } = useSharedExpenses()
  const { settlements } = useSettlements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const members = household?.memberUids || []
  const partnerUid = members.find((uid) => uid !== user?.uid)
  if (!user || !partnerUid) return null

  const profile = household?.members?.[partnerUid] || {}
  const partnerName = profile.nickname || profile.name || profile.email || 'Your partner'

  const balance = computeSettleBalance({ splitExpenses: expenses, settlements, meUid: user.uid, partnerUid })
  const { text, amount, direction } = describeBalance(balance, partnerName)

  async function handleSettle() {
    if (direction === 'even') return
    if (!window.confirm(`Mark ${direction === 'owed' ? `${partnerName}'s` : 'your'} $${amount.toFixed(2)} as settled?`)) return
    setBusy(true)
    setError('')
    try {
      // The debtor pays the creditor the full outstanding balance.
      const fromUid = direction === 'owed' ? partnerUid : user.uid
      const toUid = direction === 'owed' ? user.uid : partnerUid
      await addSettlement({ householdId, fromUid, toUid, amount, method: 'manual' })
      haptics.success()
    } catch (err) {
      setError('Could not settle — please try again.')
    } finally {
      setBusy(false)
    }
  }

  const owed = direction === 'owed'
  const even = direction === 'even'

  return (
    <div style={{
      width: '100%', maxWidth: 440,
      background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border)', padding: '1rem 1.125rem',
      boxShadow: 'var(--shadow-card)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 'var(--text-xs)', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
          Settle up
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>{text}</span>
          {!even && (
            <span style={{
              fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em',
              color: owed ? 'var(--accent)' : 'var(--danger)',
            }}>
              ${amount.toFixed(2)}
            </span>
          )}
          {even && <span style={{ fontSize: '1.1rem' }}>✓</span>}
        </div>
        {error && <p style={{ margin: '4px 0 0', color: 'var(--danger)', fontSize: '0.78rem' }}>{error}</p>}
      </div>
      {!even && (
        <button
          onClick={handleSettle}
          disabled={busy}
          className="btn btn-secondary"
          style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.9rem', fontSize: 'var(--text-sm)' }}
        >
          {busy ? 'Settling…' : 'Settle up'}
        </button>
      )}
    </div>
  )
}
