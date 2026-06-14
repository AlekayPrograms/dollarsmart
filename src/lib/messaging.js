import { getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc } from 'firebase/firestore'
import { db, getMessagingIfSupported } from '../firebase/client.js'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

export async function isMessagingSupported() {
  return (await getMessagingIfSupported()) !== null
}

/**
 * Request notification permission, register the FCM service worker, fetch the
 * token, and store it on the user doc. Returns { ok, reason }.
 *   reason: 'unsupported' | 'denied' | 'no-token' | 'error' (when ok=false)
 */
export async function enableNotifications(uid) {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return { ok: false, reason: 'unsupported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return { ok: false, reason: 'no-token' }
    await setDoc(doc(db, 'users', uid), { fcmToken: token }, { merge: true })
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Subscribe to foreground messages. Returns an unsubscribe function (or a noop
 * if messaging is unsupported).
 */
export async function onForegroundMessage(callback) {
  const messaging = await getMessagingIfSupported()
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
