import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotificationPrefs } from '../hooks/useNotificationPrefs.js'
import { enableNotifications, isMessagingSupported } from '../lib/messaging.js'

const TOGGLES = [
  { key: 'transactionAlert', label: 'Transaction detected' },
  { key: 'partnerActivity', label: 'Partner logged a split expense' },
  { key: 'approachingTarget', label: 'Approaching a budget target' },
  { key: 'monthlyRecap', label: 'Month-end recap' },
  { key: 'weeklyInsight', label: 'Weekly spending insight (Monday)' },
  { key: 'dailyNudge', label: 'Daily logging reminder' },
]

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.6rem' }}>
      <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export default function NotificationSettings() {
  const { user } = useAuth()
  const { prefs, setPref } = useNotificationPrefs()
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )
  const [supported, setSupported] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { isMessagingSupported().then(setSupported) }, [])

  async function handleEnable() {
    setBusy(true)
    setError(null)
    const res = await enableNotifications(user.uid)
    setBusy(false)
    setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default')
    if (!res.ok) {
      if (res.reason === 'denied') setError('Notifications are blocked. Enable them in your browser settings.')
      else if (res.reason === 'unsupported') setError('This device does not support push notifications.')
      else setError('Could not enable notifications. Try again.')
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <h3 style={{ fontSize: '1rem', color: 'var(--muted)' }}>Notifications</h3>

      {!supported && (
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Push notifications aren't supported here. On iPhone, add DollarSmart to your Home Screen first.
        </p>
      )}

      {supported && permission !== 'granted' && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '0.9rem', marginBottom: '0.75rem', color: 'var(--text)' }}>
          <p style={{ fontSize: '0.85rem', margin: '0 0 0.6rem' }}>
            Get a gentle nudge to log a purchase the moment it happens.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleEnable} disabled={busy}>
            {busy ? 'Enabling…' : 'Enable notifications'}
          </button>
          {error && <p style={{ color: '#F87171', fontSize: '0.8rem', marginTop: 6 }}>{error}</p>}
        </div>
      )}

      {supported && permission === 'granted' && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '0.9rem' }}>
          {TOGGLES.map((t) => (
            <Toggle
              key={t.key}
              label={t.label}
              checked={!!prefs[t.key]}
              onChange={(v) => setPref(t.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
