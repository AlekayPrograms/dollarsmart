import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { createHousehold, joinHousehold, createInviteCode } from '../lib/household.js'
import IphoneInstallPrompt from '../components/IphoneInstallPrompt.jsx'

const ERROR_MESSAGES = {
  INVALID_CODE: "That code doesn't exist. Double-check and try again.",
  CODE_ALREADY_USED: 'That code has already been used.',
  CODE_EXPIRED: 'That code has expired. Ask your partner to generate a new one.',
  ALREADY_MEMBER: "You're already in a household.",
}

export default function OnboardingPage() {
  const { user, signOutUser } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('choose')
  const [inviteCode, setInviteCode] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const { householdId } = await createHousehold(user.uid)
      // createInviteCode writes the /inviteCodes lookup doc the joiner needs,
      // so display the code it returns (not createHousehold's, which has none).
      const code = await createInviteCode(user.uid, householdId)
      setInviteCode(code)
      setView('create')
      setShowInstallPrompt(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    setLoading(true)
    setError(null)
    try {
      await joinHousehold(user.uid, joinCode.trim().toUpperCase())
      navigate('/', { replace: true })
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (view === 'choose') {
    return (
      <div className="page-center">
        <h1 style={{ marginBottom: '0.5rem' }}>Welcome to DollarSmart</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>Set up your household to get started.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 320 }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            Create a household
          </button>
          <button className="btn btn-secondary" onClick={() => setView('join')} disabled={loading}>
            Join with a code
          </button>
        </div>
        <button
          onClick={() => signOutUser()}
          style={{ background: 'none', border: 'none', color: 'var(--subtle)', fontSize: '0.85rem', cursor: 'pointer', marginTop: '2rem' }}
        >
          Sign out
        </button>
      </div>
    )
  }

  if (view === 'create') {
    return (
      <div className="page-center">
        <h2 style={{ marginBottom: '0.5rem' }}>Your household is ready!</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Share this code with your partner:</p>
        <div style={{
          fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.3em',
          background: 'var(--surface-2)', padding: '1rem 2rem', borderRadius: 16,
          marginBottom: '1.5rem', color: '#10B981',
        }}>
          {inviteCode}
        </div>
        <p style={{ color: 'var(--subtle)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Code expires in 24 hours and can only be used once.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>
          Continue →
        </button>
        {showInstallPrompt && (
          <IphoneInstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
        )}
      </div>
    )
  }

  if (view === 'join') {
    return (
      <div className="page-center">
        <h2 style={{ marginBottom: '0.5rem' }}>Join a household</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Enter the code your partner shared with you.</p>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="XXXXXX"
          style={{
            fontSize: '2rem', fontWeight: 700, letterSpacing: '0.3em', textAlign: 'center',
            width: '100%', maxWidth: 220, padding: '0.75rem',
            background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 12, marginBottom: '1rem', outline: 'none',
          }}
        />
        {error && <p style={{ color: '#F87171', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => { setView('choose'); setError(null) }}>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={loading || joinCode.length !== 6}
          >
            {loading ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    )
  }
}
