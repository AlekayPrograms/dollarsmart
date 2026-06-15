import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/** Streams the current user's recurring-expense rules. */
export function useRecurring() {
  const { user } = useAuth()
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setRecurring([]); setLoading(false); return }
    const q = query(collection(db, 'recurringExpenses'), where('uid', '==', user.uid))
    return onSnapshot(q, (snap) => {
      setRecurring(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [user])

  return { recurring, loading }
}
