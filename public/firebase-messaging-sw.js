/* global importScripts, firebase, clients */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDiefFNJ_uMmc7M5VuW0AwWAfvziESLV3Y',
  authDomain: 'dollarsmart-couple.firebaseapp.com',
  projectId: 'dollarsmart-couple',
  storageBucket: 'dollarsmart-couple.firebasestorage.app',
  messagingSenderId: '411910999028',
  appId: '1:411910999028:web:a7b62410aa0f463d75c7a1',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  const data = payload.data || {}
  const params = new URLSearchParams()
  if (data.amount) params.set('amount', data.amount)
  if (data.categoryId) params.set('categoryId', data.categoryId)
  if (data.pendingId) params.set('pendingId', data.pendingId)
  self.registration.showNotification(title || 'DollarSmart', {
    body: body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: `/log?${params.toString()}` },
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
