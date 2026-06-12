import { useState } from 'react'

function isIphoneSafari() {
  const ua = navigator.userAgent
  const isIphone = /iPhone/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
  const isStandalone = window.navigator.standalone === true
  return isIphone && isSafari && !isStandalone
}

export default function IphoneInstallPrompt({ onDismiss }) {
  const [confirmSkip, setConfirmSkip] = useState(false)

  if (!isIphoneSafari()) return null

  if (confirmSkip) {
    return (
      <div style={overlay}>
        <div style={card}>
          <p style={{ color: '#F87171', fontWeight: 600, marginBottom: '0.75rem' }}>
            ⚠️ Without installing, you won't receive transaction notifications.
          </p>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            You can always install later from Safari's Share menu.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setConfirmSkip(false)}>Go back</button>
            <button className="btn btn-primary" onClick={onDismiss}>Skip anyway</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <h2 style={{ marginBottom: '0.5rem' }}>One more step 📱</h2>
        <p style={{ color: '#94A3B8', marginBottom: '1.25rem' }}>
          To receive notifications when you make a purchase, add DollarSmart to your Home Screen.
        </p>
        <ol style={{ textAlign: 'left', color: '#CBD5E1', lineHeight: 2, paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
          <li>Tap the <strong style={{ color: '#F8FAFC' }}>Share</strong> button at the bottom of Safari (the box with an arrow)</li>
          <li>Scroll down and tap <strong style={{ color: '#F8FAFC' }}>"Add to Home Screen"</strong></li>
          <li>Tap <strong style={{ color: '#F8FAFC' }}>Add</strong> in the top right</li>
          <li>Open DollarSmart from your Home Screen and allow notifications</li>
        </ol>
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.75rem' }} onClick={onDismiss}>
          Done — I added it ✓
        </button>
        <button
          style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.85rem', cursor: 'pointer' }}
          onClick={() => setConfirmSkip(true)}
        >
          Skip (not recommended)
        </button>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'flex-end', zIndex: 1000,
}

const card = {
  background: '#1E293B', borderRadius: '20px 20px 0 0',
  padding: '2rem 1.5rem', width: '100%', textAlign: 'center',
}
