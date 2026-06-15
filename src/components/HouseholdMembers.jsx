import { useEffect, useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { kickMember } from '../lib/functions.js'

const badge = {
  fontSize: '0.62rem', fontWeight: 700, borderRadius: 5, padding: '1px 6px',
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

/**
 * Shows everyone in the household. Each member self-registers their name/email
 * onto the household doc so partners can see who's who. The leader (creator)
 * can remove other members.
 */
export default function HouseholdMembers() {
  const { user } = useAuth()
  const { householdId, household } = useHousehold()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  // Self-register my profile so the other member can see my name.
  useEffect(() => {
    if (!user || !householdId || !household) return
    const mine = household.members?.[user.uid]
    const name = user.displayName || ''
    const email = user.email || ''
    if (!mine || mine.name !== name || mine.email !== email) {
      setDoc(doc(db, 'households', householdId), { members: { [user.uid]: { name, email } } }, { merge: true }).catch(() => {})
    }
  }, [user, householdId, household])

  if (!household) return null
  const members = household.memberUids || []
  const leader = household.createdBy || members[0]
  const iAmLeader = leader === user?.uid
  const profiles = household.members || {}

  async function handleKick(uid) {
    if (!window.confirm('Remove this person from your household? They will lose access to shared expenses.')) return
    setBusy(uid)
    setError('')
    try {
      await kickMember({ memberUid: uid })
    } catch (err) {
      setError(err?.message || 'Could not remove member.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <p className="section-label">Household members</p>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {members.map((uid) => {
          const p = profiles[uid] || {}
          const isMe = uid === user?.uid
          const isLeader = uid === leader
          const name = p.name || p.email || (isMe ? 'You' : 'Member')
          return (
            <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{name}</span>
                  {isLeader && <span style={{ ...badge, color: 'var(--accent)', background: 'rgba(16,185,129,0.15)' }}>Leader</span>}
                  {isMe && <span style={{ ...badge, color: 'var(--subtle)', background: 'rgba(255,255,255,0.06)' }}>You</span>}
                </div>
                {p.email && p.name && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
                )}
              </div>
              {iAmLeader && !isMe && (
                <button
                  onClick={() => handleKick(uid)}
                  disabled={busy === uid}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {busy === uid ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          )
        })}
        {error && <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.78rem' }}>{error}</p>}
      </div>
    </div>
  )
}
