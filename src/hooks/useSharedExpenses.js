import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useHousehold } from './useHousehold.js'

/**
 * Streams the whole household's shared + split expenses (logged by either
 * partner), most recent first. Personal expenses are never included here —
 * those stay private to their owner via useExpenses.
 */
export function useSharedExpenses() {
  const { householdId } = useHousehold()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) { setExpenses([]); setLoading(false); return }
    const q = query(
      collection(db, 'expenses'),
      where('householdId', '==', householdId),
      where('poolType', 'in', ['shared', 'split']),
      orderBy('date', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [householdId])

  return { expenses, loading }
}
