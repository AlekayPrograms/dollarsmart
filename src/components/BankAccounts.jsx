import { useEffect, useState, useCallback } from 'react'
import { getAccounts, disconnectBank } from '../lib/functions.js'

const typeEmoji = (a) => (a.type === 'credit' ? '💳' : a.type === 'depository' ? '🏦' : '💼')
const prettyType = (a) => (a.subtype || a.type || 'account').replace(/_/g, ' ')

/**
 * Lists the user's connected banks (each masked), grouped by institution, with
 * a per-bank disconnect. Renders nothing when no bank is connected (the Connect
 * button covers that case).
 */
export default function BankAccounts() {
  const [banks, setBanks] = useState(null) // null = loading
  const [busy, setBusy] = useState(null) // itemId being disconnected
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getAccounts()
      .then((res) => setBanks(res.data?.banks ?? []))
      .catch(() => setBanks([]))
  }, [])
  useEffect(() => { load() }, [load])

  async function handleDisconnect(bank) {
    if (!window.confirm(`Disconnect ${bank.institutionName}? Its transactions will stop being detected.`)) return
    setBusy(bank.itemId)
    setError('')
    try {
      await disconnectBank({ itemId: bank.itemId })
      setBanks((bs) => (bs || []).filter((b) => b.itemId !== bank.itemId))
    } catch (err) {
      setError('Could not disconnect — please try again.')
    } finally {
      setBusy(null)
    }
  }

  if (banks === null) return <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--subtle)' }}>Loading accounts…</p>
  if (banks.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {banks.map((bank) => (
        <div key={bank.itemId} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {bank.institutionName}
            </span>
            <button
              onClick={() => handleDisconnect(bank)}
              disabled={busy === bank.itemId}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
            >
              {busy === bank.itemId ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>

          {bank.accounts.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--subtle)' }}>
              {bank.error ? 'Needs reconnect' : 'No accounts'}
            </p>
          ) : bank.accounts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{typeEmoji(a)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}{a.mask ? <span style={{ color: 'var(--muted)' }}> ••{a.mask}</span> : null}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--subtle)', textTransform: 'capitalize' }}>{prettyType(a)}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
      {error && <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
    </div>
  )
}
