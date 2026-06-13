import { useCallback } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from './useHousehold.js'

/**
 * Write monthly targets and read shared ones. Personal targets live on the
 * user doc (read directly in SettingsPage via its own snapshot); shared
 * targets live on the household doc.
 */
export function useMonthlyTargets() {
  const { user } = useAuth()
  const { householdId, household } = useHousehold()

  const sharedTargets = household?.sharedTargets ?? {}

  const setPersonalTarget = useCallback(async (categoryId, amount) => {
    await setDoc(
      doc(db, 'users', user.uid),
      { monthlyTargets: { [categoryId]: amount } },
      { merge: true },
    )
  }, [user])

  const setSharedTarget = useCallback(async (categoryId, amount) => {
    if (!householdId) return
    await setDoc(
      doc(db, 'households', householdId),
      { sharedTargets: { [categoryId]: amount } },
      { merge: true },
    )
  }, [householdId])

  return { sharedTargets, setPersonalTarget, setSharedTarget }
}
