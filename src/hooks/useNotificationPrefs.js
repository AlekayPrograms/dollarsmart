import { useEffect, useState, useCallback } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { applyPrefDefaults } from '../lib/notificationPrefs.js'

export function useNotificationPrefs() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(applyPrefDefaults(undefined))

  useEffect(() => {
    if (!user) { setPrefs(applyPrefDefaults(undefined)); return }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setPrefs(applyPrefDefaults(snap.exists() ? snap.data().notificationPrefs : undefined))
    })
  }, [user])

  const setPref = useCallback(async (key, value) => {
    if (!user) return
    await setDoc(
      doc(db, 'users', user.uid),
      { notificationPrefs: { [key]: value } },
      { merge: true },
    )
  }, [user])

  return { prefs, setPref }
}
