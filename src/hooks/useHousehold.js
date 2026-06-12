import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export function useHousehold() {
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState(undefined)
  const [household, setHousehold] = useState(null)

  useEffect(() => {
    if (!user) { setHouseholdId(null); return }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setHouseholdId(snap.exists() ? (snap.data().householdId ?? null) : null)
    })
    return unsub
  }, [user])

  useEffect(() => {
    if (!householdId) { setHousehold(null); return }
    const unsub = onSnapshot(doc(db, 'households', householdId), (snap) => {
      setHousehold(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
    return unsub
  }, [householdId])

  return { householdId, household, loading: householdId === undefined }
}
