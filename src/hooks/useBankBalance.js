import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/**
 * Live bank balance for the current user. `balance` is null until one has been
 * set, then a number that the app keeps current as entries are logged/deleted.
 */
export function useBankBalance() {
  const { user } = useAuth()
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    if (!user) { setBalance(null); return }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const v = snap.exists() ? snap.data().bankBalance : undefined
      setBalance(typeof v === 'number' ? v : null)
    })
  }, [user])

  return { balance }
}
