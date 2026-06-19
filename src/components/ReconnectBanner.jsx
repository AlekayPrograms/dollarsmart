import { lazy, Suspense, useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

// Lazy so the Plaid SDK isn't pulled into the home/landing chunk — it only
// loads if this banner actually needs to show.
const ConnectBankButton = lazy(() => import('./ConnectBankButton.jsx'))

/**
 * Non-blocking banner shown only when the user's bank connection needs a
 * refresh (Plaid ITEM_LOGIN_REQUIRED / expiration). Reuses the connect flow.
 */
export default function ReconnectBanner() {
  const { user } = useAuth()
  const [status, setStatus] = useState(undefined)

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setStatus(snap.exists() ? snap.data().bankStatus : undefined)
    })
  }, [user])

  if (status !== 'reauth_required') return null

  return (
    <div style={{
      width: '100%', maxWidth: 440, background: '#422006', border: '1px solid #92400E',
      borderRadius: 12, padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ fontSize: '0.9rem', color: '#FDE68A' }}>
        Your bank connection needs a refresh — reconnect to keep detecting transactions.
      </div>
      <Suspense fallback={null}>
        <ConnectBankButton label="Reconnect bank" />
      </Suspense>
    </div>
  )
}
