import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useHousehold } from './useHousehold.js'

/**
 * Streams the household's settlement ledger (reimbursements between partners),
 * most recent first.
 */
export function useSettlements() {
  const { householdId } = useHousehold()
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) { setSettlements([]); setLoading(false); return }
    const q = query(
      collection(db, 'settlements'),
      where('householdId', '==', householdId),
      orderBy('date', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSettlements(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [householdId])

  return { settlements, loading }
}
