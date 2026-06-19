import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { initializeApp } from 'firebase/app'
import { getMessaging } from 'firebase/messaging/sw'

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

// Initialize FCM in the service worker. We intentionally do NOT register an
// onBackgroundMessage handler: our messages carry a `notification` payload, so
// FCM displays exactly one notification on its own (data-only didn't display on
// iOS, and a second manual show double-counted on Android). Taps are routed by
// each message's webpush.fcmOptions.link, which FCM's default click handler opens.
getMessaging(app)
