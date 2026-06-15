import { useEffect, useState } from 'react'
import { getAccounts, disconnectBank } from '../lib/functions.js'

const typeEmoji = (a) => (a.type === 'credit' ? '💳' : a.type === 'depository' ? '🏦' : '💼')
const prettyType = (a) => (a.subtype || a.type || 'account').replace(/_/g, ' ')

/**
 * Lists the user's connected bank accounts (masked) and offers a disconnect
 * action. Renders nothing when no bank is connected (the Connect button covers
 * that case).
 */
export default function BankAccounts() {
  const [accounts, setAccounts] = useState(null) // null = loading
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAccounts()
      .then((res) => { if (active) setAccounts(res.data?.accounts ?? []) })
      .catch(() => { if (active) setAccounts([]) })
    return () => { active = false }
  }, [])

  async function handleDisconnect() {
    if (!window.confirm("Disconnect your bank? Transactions will stop being detected. (On the Plaid trial this doesn't free a connection slot.)")) return
    setBusy(true)
    setError('')
    try {
      await disconnectBank()
      setAccounts([])
    } catch (err) {
      setError('Could not disconnect — please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (accounts === null) return <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--subtle)' }}>Loading accounts…</p>
  if (accounts.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {accounts.map((a, i) => (
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

      <button
        className="btn btn-secondary"
        style={{ width: '100%', justifyContent: 'flex-start', background: 'none', border: 'none', padding: 0, fontWeight: 500, color: 'var(--danger)', fontSize: '0.9rem' }}
        onClick={handleDisconnect}
        disabled={busy}
      >
        {busy ? 'Disconnecting…' : 'Disconnect bank'}
      </button>
      {error && <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
    </div>
  )
}
