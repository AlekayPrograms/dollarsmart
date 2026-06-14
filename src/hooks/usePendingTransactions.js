import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/**
 * Streams the current user's pending (Plaid-detected, unconfirmed) transactions.
 */
export function usePendingTransactions() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])

  useEffect(() => {
    if (!user) { setPending([]); return }
    const q = query(
      collection(db, 'pendingTransactions'),
      where('uid', '==', user.uid),
      where('status', '==', 'pending'),
    )
    return onSnapshot(q, (snap) => {
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [user])

  return pending
}
