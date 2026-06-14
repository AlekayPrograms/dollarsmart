import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { createInviteCode, isCodeExpired } from '../lib/household.js'

/**
 * Shows the household's shareable invite code and lets a member generate a
 * fresh one (codes are single-use and expire after 24h, so a regenerate path
 * is needed once the first code is used or stale).
 */
export default function HouseholdInvite() {
  const { user } = useAuth()
  const { householdId, household } = useHousehold()
  const [freshCode, setFreshCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const partnerJoined = (household?.memberUids?.length ?? 1) >= 2

  // Show the stored code only while it's still usable; otherwise require a regen.
  const storedUsable =
    household && household.inviteUsed === false && !isCodeExpired(household.inviteExpiresAt)
  const shareCode = freshCode ?? (storedUsable ? household.inviteCode : null)

  async function regenerate() {
    setBusy(true)
    setError(null)
    try {
      const code = await createInviteCode(user.uid, householdId)
      setFreshCode(code)
    } catch (e) {
      setError('Could not generate a code. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <h3 style={{ fontSize: '1rem', color: '#CBD5E1' }}>Household</h3>
      <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: 0 }}>
        {partnerJoined ? 'Your partner has joined. 🎉' : 'Waiting for your partner to join.'}
      </p>

      {shareCode && (
        <div style={{
          fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.25em', textAlign: 'center',
          background: '#1E293B', border: '1px solid #334155', borderRadius: 12,
          padding: '0.75rem', color: '#10B981', marginBottom: '0.6rem',
        }}>
          {shareCode}
        </div>
      )}

      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={regenerate} disabled={busy}>
        {busy ? 'Generating…' : 'Generate new invite code'}
      </button>
      {error && <p style={{ color: '#F87171', fontSize: '0.8rem', marginTop: 6 }}>{error}</p>}
      <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 6 }}>
        Codes are single-use and expire after 24 hours.
      </p>
    </div>
  )
}
