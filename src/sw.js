import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

// Handle SKIP_WAITING from vite-plugin-pwa autoUpdate
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Firebase config values are public identifiers — safe to hardcode in SW
const app = initializeApp({
  apiKey: 'AIzaSyDiefFNJ_uMmc7M5VuW0AwWAfvziESLV3Y',
  authDomain: 'dollarsmart-couple.firebaseapp.com',
  projectId: 'dollarsmart-couple',
  storageBucket: 'dollarsmart-couple.firebasestorage.app',
  messagingSenderId: '411910999028',
  appId: '1:411910999028:web:a7b62410aa0f463d75c7a1',
})

const messaging = getMessaging(app)

onBackgroundMessage(messaging, (payload) => {
  // Messages are data-only (see functions/src/notifications.js) so we display
  // exactly one notification here and decide where a tap should go.
  const data = payload.data || {}
  let url
  if (data.amount || data.pendingId) {
    // A transaction prompt → open the Log screen pre-filled.
    const params = new URLSearchParams()
    if (data.amount) params.set('amount', data.amount)
    if (data.categoryId) params.set('categoryId', data.categoryId)
    if (data.entryType) params.set('entryType', data.entryType)
    if (data.pendingId) params.set('pendingId', data.pendingId)
    if (data.date) params.set('date', data.date)
    if (data.merchantName) params.set('merchantName', data.merchantName)
    url = `/log?${params.toString()}`
  } else {
    // Everything else routes to its own page (e.g. removal → Expenses).
    url = data.path || '/'
  }
  self.registration.showNotification(data.title || 'DollarSmart', {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url },
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if ('focus' in win) { win.focus(); win.navigate(url); return }
      }
      return clients.openWindow(url)
    }),
  )
})
