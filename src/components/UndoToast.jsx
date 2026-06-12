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
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1E293B', color: '#F8FAFC', borderRadius: 12,
      padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 1000, minWidth: 280,
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
