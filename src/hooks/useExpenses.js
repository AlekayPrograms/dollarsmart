import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/**
 * Streams the current user's expenses in real time, most recent first.
 * Per the spec privacy model, a user only ever sees their own expenses.
 */
export function useExpenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setExpenses([]); setLoading(false); return }
    const q = query(
      collection(db, 'expenses'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  return { expenses, loading }
}
