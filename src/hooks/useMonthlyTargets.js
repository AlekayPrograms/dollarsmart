import { useCallback, useEffect, useState } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from './useHousehold.js'

export function useMonthlyTargets() {
  const { user } = useAuth()
  const { householdId, household } = useHousehold()
  const [personalTargets, setPersonalTargets] = useState({})

  useEffect(() => {
    if (!user) { setPersonalTargets({}); return }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setPersonalTargets(snap.exists() ? (snap.data().monthlyTargets ?? {}) : {})
    })
  }, [user])

  const sharedTargets = household?.sharedTargets ?? {}

  const setPersonalTarget = useCallback(async (categoryId, amount) => {
    await setDoc(doc(db, 'users', user.uid), { monthlyTargets: { [categoryId]: amount } }, { merge: true })
  }, [user])

  const setSharedTarget = useCallback(async (categoryId, amount) => {
    if (!householdId) return
    await setDoc(doc(db, 'households', householdId), { sharedTargets: { [categoryId]: amount } }, { merge: true })
  }, [householdId])

  return { personalTargets, sharedTargets, setPersonalTarget, setSharedTarget }
}
