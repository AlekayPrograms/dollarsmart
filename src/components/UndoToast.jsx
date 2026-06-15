import { useEffect, useState } from 'react'

/**
 * A 5-second undo toast. Calls onUndo if the user taps Undo, otherwise
 * calls onExpire after the countdown so the caller can finalize the action.
 */
export default function UndoToast({ message, onUndo, onExpire, durationMs = 5000 }) {
  const [remaining, setRemaining] = useState(Math.ceil(durationMs / 1000))

  useEffect(() => {
    const expireTimer = setTimeout(onExpire, durationMs)
    const tick = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => { clearTimeout(expireTimer); clearInterval(tick) }
  }, [durationMs, onExpire])

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 16px)',
      left: '50%', transform: 'translateX(-50%)',
      background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 12,
      padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 1000, minWidth: 280,
      border: '1px solid var(--border)',
    }}>
      <span style={{ flex: 1, fontSize: '0.9rem' }}>{message}</span>
      <button
        onClick={onUndo}
        style={{
          background: 'none', border: 'none', color: '#10B981', fontWeight: 700,
          cursor: 'pointer', fontSize: '0.9rem',
        }}
      >
        Undo ({remaining})
      </button>
    </div>
  )
}
