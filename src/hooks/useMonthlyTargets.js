import { useCallback, useEffect, useState } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export function useMonthlyTargets() {
  const { user } = useAuth()
  const [personalTargets, setPersonalTargets] = useState({})

  useEffect(() => {
    if (!user) { setPersonalTargets({}); return }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setPersonalTargets(snap.exists() ? (snap.data().monthlyTargets ?? {}) : {})
    })
  }, [user])

  const setPersonalTarget = useCallback(async (categoryId, amount) => {
    await setDoc(doc(db, 'users', user.uid), { monthlyTargets: { [categoryId]: amount } }, { merge: true })
  }, [user])

  return { personalTargets, setPersonalTarget }
}
