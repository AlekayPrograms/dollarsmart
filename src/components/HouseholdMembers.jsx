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
 * onto the household doc and can set a custom nickname (shown to both). The
 * leader (creator) can remove other members.
 */
export default function HouseholdMembers() {
  const { user } = useAuth()
  const { householdId, household } = useHousehold()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [editingNick, setEditingNick] = useState(false)
  const [nickDraft, setNickDraft] = useState('')

  // Self-register my name/email (merge leaves any nickname I've set intact).
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

  const displayName = (uid) => {
    const p = profiles[uid] || {}
    return p.nickname || p.name || p.email || (uid === user?.uid ? 'You' : 'Member')
  }

  function startEditNick() {
    setNickDraft(profiles[user.uid]?.nickname || '')
    setEditingNick(true)
  }

  async function saveNick() {
    setEditingNick(false)
    const nickname = nickDraft.trim()
    await setDoc(doc(db, 'households', householdId), { members: { [user.uid]: { nickname } } }, { merge: true }).catch(() => {})
  }

  async function handleKick(uid) {
    if (!window.confirm('Remove this person from your household? They will lose access to split expenses.')) return
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
          return (
            <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isMe && editingNick ? (
                  <input
                    autoFocus
                    value={nickDraft}
                    onChange={(e) => setNickDraft(e.target.value)}
                    onBlur={saveNick}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveNick(); if (e.key === 'Escape') setEditingNick(false) }}
                    placeholder="Your nickname"
                    maxLength={24}
                    style={{
                      width: '100%', padding: '0.3rem 0.5rem', borderRadius: 8,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: '0.9rem', outline: 'none',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{displayName(uid)}</span>
                    {isLeader && <span style={{ ...badge, color: 'var(--accent)', background: 'rgba(16,185,129,0.15)' }}>Leader</span>}
                    {isMe && <span style={{ ...badge, color: 'var(--subtle)', background: 'rgba(255,255,255,0.06)' }}>You</span>}
                    {isMe && (
                      <button
                        onClick={startEditNick}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, padding: 0 }}
                      >
                        {p.nickname ? 'Edit nickname' : 'Set nickname'}
                      </button>
                    )}
                  </div>
                )}
                {p.email && (p.nickname || p.name) && (
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
