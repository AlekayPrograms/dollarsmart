# DollarSmart Phase 6: Notifications (FCM Foundation + Transaction Push) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver real push notifications — set up Firebase Cloud Messaging on the web/PWA, let each user enable notifications and tune preferences, and turn the existing in-app pending-transaction banner into an actual push ("Looks like you spent $24.50 at Chipotle 🍔 — log it?") that deep-links into a pre-filled Quick Log.

**Architecture:** FCM web push needs a dedicated service worker (`public/firebase-messaging-sw.js`) plus a client helper that requests permission, fetches the FCM registration token (with the project's VAPID key), and stores it on the user doc. The Plaid webhook (Phase 5) is extended: after writing a `pendingTransactions` doc it looks up the recipient's `fcmToken` and `notificationPrefs.transactionAlert` and sends an FCM message via the Admin SDK. Notification taps open `/log` with prefill passed as URL query params (a service worker can't set React Router state), so `LogPage` gains a query-param fallback. Notification preferences live on the user doc; only `transactionAlert` is wired to behavior this phase — the other prefs (dailyNudge, partnerActivity, approachingTarget) are stored with sensible defaults for Phase 7.

**Tech Stack:** Firebase Cloud Messaging (`firebase/messaging` on the client, `admin.messaging()` in functions), the existing vite-plugin-pwa service worker (coexists with the FCM SW), Vitest for client pure-logic, Jest for functions.

**Out of scope (Phase 7):** approaching-shared-target push, partner-logged-shared push, daily catch-up nudge (scheduled), weekly AI insight (Anthropic API). This plan ships the FCM foundation and the transaction alert end-to-end.

**Execution notes:**
- **Prerequisite (Task 8):** generate a Web Push (VAPID) key pair in Firebase console → Project Settings → Cloud Messaging, and put it in `.env.local` as `VITE_FIREBASE_VAPID_KEY`. Done by the human; the rest can be built first.
- **Qwen candidate:** Task 1 (`notificationPrefs.js`) is pure-logic TDD. Everything else is browser/FCM/Firebase integration — Claude.
- The Firebase config values in `firebase-messaging-sw.js` are public identifiers (already shipped in the client bundle); hardcoding them in the committed SW file is the standard FCM pattern and is safe.

---

## File Structure

```
public/
└── firebase-messaging-sw.js        # FCM background handler + notification click → deep link
src/
├── lib/
│   ├── notificationPrefs.js        # DEFAULT_PREFS + applyPrefDefaults (pure) — QWEN
│   └── messaging.js                # isMessagingSupported, enableNotifications, onForegroundMessage
├── hooks/
│   └── useNotificationPrefs.js     # read/write notificationPrefs on the user doc
├── components/
│   └── NotificationSettings.jsx    # enable button + per-type toggles + denied banner
├── pages/
│   ├── SettingsPage.jsx            # MODIFY: render <NotificationSettings/>
│   └── LogPage.jsx                 # MODIFY: prefill from URL query params (SW deep link)
├── firebase/
│   └── client.js                   # MODIFY: export getMessaging instance (guarded)
tests/
└── notificationPrefs.test.js
functions/
├── src/
│   ├── notifications.js            # buildTransactionMessage (pure) + sendPush wiring
│   └── handlers/plaidWebhook.js    # MODIFY: send transaction-alert push after pending write
└── test/
    ├── notifications.test.js
    └── plaidWebhook.test.js        # MODIFY: assert push is sent for opted-in users
.env.local                          # MODIFY (human): add VITE_FIREBASE_VAPID_KEY
.env.example                        # MODIFY: document VITE_FIREBASE_VAPID_KEY
```

**User doc fields used:** `fcmToken` (string), `notificationPrefs` (`{ transactionAlert, dailyNudge, nudgeTime, partnerActivity, approachingTarget }`).

---

## Task 1: Notification preferences model (QWEN — pure logic TDD)

**Files:**
- Create: `src/lib/notificationPrefs.js`
- Test: `tests/notificationPrefs.test.js`

- [ ] **Step 1: Write the failing test `tests/notificationPrefs.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { DEFAULT_PREFS, applyPrefDefaults } from '../src/lib/notificationPrefs.js'

describe('DEFAULT_PREFS', () => {
  it('has all five preference keys with sane defaults', () => {
    expect(DEFAULT_PREFS).toEqual({
      transactionAlert: true,
      dailyNudge: false,
      nudgeTime: '20:00',
      partnerActivity: true,
      approachingTarget: true,
    })
  })
})

describe('applyPrefDefaults', () => {
  it('returns defaults when given undefined', () => {
    expect(applyPrefDefaults(undefined)).toEqual(DEFAULT_PREFS)
  })

  it('returns defaults when given null', () => {
    expect(applyPrefDefaults(null)).toEqual(DEFAULT_PREFS)
  })

  it('overlays stored values on top of defaults', () => {
    const merged = applyPrefDefaults({ transactionAlert: false, nudgeTime: '08:30' })
    expect(merged.transactionAlert).toBe(false)
    expect(merged.nudgeTime).toBe('08:30')
    // untouched keys keep defaults
    expect(merged.partnerActivity).toBe(true)
    expect(merged.dailyNudge).toBe(false)
  })

  it('ignores unknown keys', () => {
    const merged = applyPrefDefaults({ bogus: 123 })
    expect(merged.bogus).toBeUndefined()
    expect(merged).toEqual(DEFAULT_PREFS)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/notificationPrefs.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/notificationPrefs.js`**

```js
export const DEFAULT_PREFS = {
  transactionAlert: true,
  dailyNudge: false,
  nudgeTime: '20:00',
  partnerActivity: true,
  approachingTarget: true,
}

/**
 * Overlay a (possibly partial / missing) stored prefs object on top of the
 * defaults, dropping any keys we don't recognise. Always returns a complete
 * prefs object with exactly the DEFAULT_PREFS keys.
 */
export function applyPrefDefaults(stored) {
  const out = { ...DEFAULT_PREFS }
  if (stored && typeof stored === 'object') {
    for (const key of Object.keys(DEFAULT_PREFS)) {
      if (key in stored && stored[key] !== undefined) out[key] = stored[key]
    }
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/notificationPrefs.test.js`
Expected: PASS — all cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notificationPrefs.js tests/notificationPrefs.test.js
git commit -m "feat: add notification preferences model with defaults"
```

---

## Task 2: FCM client library + service worker

**Files:**
- Create: `public/firebase-messaging-sw.js`
- Create: `src/lib/messaging.js`
- Modify: `src/firebase/client.js`
- Modify: `.env.example`

- [ ] **Step 1: Create `public/firebase-messaging-sw.js`**

This runs as a standalone service worker (no bundler, no env). Firebase config values are public identifiers. It shows background notifications and routes taps to a pre-filled Quick Log via query params.

```js
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
```

- [ ] **Step 2: Add messaging export to `src/firebase/client.js`**

Add this to the imports at the top:
```js
import { getMessaging, isSupported as isMessagingSupportedRaw } from 'firebase/messaging'
```

Add this at the end of the file:
```js
// Messaging is only available in browsers with service-worker + Push support
// (e.g. not SSR, not some iOS contexts). Resolve lazily and guarded.
export async function getMessagingIfSupported() {
  try {
    if (await isMessagingSupportedRaw()) return getMessaging(app)
  } catch {
    /* unsupported */
  }
  return null
}
```

- [ ] **Step 3: Create `src/lib/messaging.js`**

```js
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
```

- [ ] **Step 4: Document the VAPID key in `.env.example`**

Add this line under the Firebase config block:
```
# Firebase Cloud Messaging Web Push certificate (Project Settings > Cloud Messaging)
VITE_FIREBASE_VAPID_KEY=
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (the `firebase/messaging` import resolves; SW file is copied from public/).

- [ ] **Step 6: Commit**

```bash
git add public/firebase-messaging-sw.js src/firebase/client.js src/lib/messaging.js .env.example
git commit -m "feat: add FCM service worker and client messaging helpers"
```

---

## Task 3: Notification preferences hook

**Files:**
- Create: `src/hooks/useNotificationPrefs.js`

- [ ] **Step 1: Write `src/hooks/useNotificationPrefs.js`**

```js
import { useEffect, useState, useCallback } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { applyPrefDefaults } from '../lib/notificationPrefs.js'

/**
 * Live notification preferences for the current user, always returned complete
 * (defaults overlaid). `setPref(key, value)` persists a single key.
 */
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
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNotificationPrefs.js
git commit -m "feat: add useNotificationPrefs hook"
```

---

## Task 4: Notification settings UI

**Files:**
- Create: `src/components/NotificationSettings.jsx`
- Modify: `src/pages/SettingsPage.jsx`

- [ ] **Step 1: Write `src/components/NotificationSettings.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotificationPrefs } from '../hooks/useNotificationPrefs.js'
import { enableNotifications, isMessagingSupported } from '../lib/messaging.js'

const TOGGLES = [
  { key: 'transactionAlert', label: 'Transaction detected' },
  { key: 'partnerActivity', label: 'Partner logged a shared expense' },
  { key: 'approachingTarget', label: 'Approaching a shared target' },
]

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.6rem' }}>
      <span style={{ fontSize: '0.9rem', color: '#CBD5E1' }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export default function NotificationSettings() {
  const { user } = useAuth()
  const { prefs, setPref } = useNotificationPrefs()
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )
  const [supported, setSupported] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { isMessagingSupported().then(setSupported) }, [])

  async function handleEnable() {
    setBusy(true)
    setError(null)
    const res = await enableNotifications(user.uid)
    setBusy(false)
    setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default')
    if (!res.ok) {
      if (res.reason === 'denied') setError('Notifications are blocked. Enable them in your browser settings.')
      else if (res.reason === 'unsupported') setError('This device does not support push notifications.')
      else setError('Could not enable notifications. Try again.')
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <h3 style={{ fontSize: '1rem', color: '#CBD5E1' }}>Notifications</h3>

      {!supported && (
        <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
          Push notifications aren't supported here. On iPhone, add DollarSmart to your Home Screen first.
        </p>
      )}

      {supported && permission !== 'granted' && (
        <div style={{ background: '#1E293B', borderRadius: 10, padding: '0.9rem', marginBottom: '0.75rem', color: '#F8FAFC' }}>
          <p style={{ fontSize: '0.85rem', margin: '0 0 0.6rem' }}>
            Get a gentle nudge to log a purchase the moment it happens.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleEnable} disabled={busy}>
            {busy ? 'Enabling…' : 'Enable notifications'}
          </button>
          {error && <p style={{ color: '#F87171', fontSize: '0.8rem', marginTop: 6 }}>{error}</p>}
        </div>
      )}

      {supported && permission === 'granted' && (
        <div style={{ background: '#1E293B', borderRadius: 10, padding: '0.9rem' }}>
          {TOGGLES.map((t) => (
            <Toggle
              key={t.key}
              label={t.label}
              checked={!!prefs[t.key]}
              onChange={(v) => setPref(t.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Render it in `src/pages/SettingsPage.jsx`**

Add the import:
```jsx
import NotificationSettings from '../components/NotificationSettings.jsx'
```

Add `<NotificationSettings />` immediately below the "Bank connection" block (above the CSV export button).

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/NotificationSettings.jsx src/pages/SettingsPage.jsx
git commit -m "feat: add notification settings UI with enable flow and toggles"
```

---

## Task 5: LogPage query-param prefill (service-worker deep link)

A tapped notification opens the app via the service worker, which can only pass data in the URL — not React Router state. `LogPage` must read prefill from query params, falling back to router state.

**Files:**
- Modify: `src/pages/LogPage.jsx`

- [ ] **Step 1: Read query params as a prefill source in `src/pages/LogPage.jsx`**

Replace the existing prefill block:
```jsx
  const location = useLocation()
  const prefill = location.state || {}

  const [amountText, setAmountText] = useState(prefill.prefillAmount != null ? String(prefill.prefillAmount) : '')
  const [categoryId, setCategoryId] = useState(prefill.prefillCategoryId ?? null)
  const [type, setType] = useState('expense')
  const [poolType, setPoolType] = useState(prefill.prefillSplit ? 'split' : 'personal')
```

with:
```jsx
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  // Router state (in-app banner) takes priority; query params come from a
  // tapped push notification opened by the service worker.
  const prefill = {
    prefillAmount: location.state?.prefillAmount ?? (params.get('amount') ? Number(params.get('amount')) : undefined),
    prefillCategoryId: location.state?.prefillCategoryId ?? params.get('categoryId') ?? undefined,
    prefillSplit: location.state?.prefillSplit ?? false,
    pendingId: location.state?.pendingId ?? params.get('pendingId') ?? undefined,
  }

  const [amountText, setAmountText] = useState(prefill.prefillAmount != null ? String(prefill.prefillAmount) : '')
  const [categoryId, setCategoryId] = useState(prefill.prefillCategoryId ?? null)
  const [type, setType] = useState('expense')
  const [poolType, setPoolType] = useState(prefill.prefillSplit ? 'split' : 'personal')
```

> The existing `handleSave` already deletes `prefill.pendingId` after saving — no change needed there since `prefill.pendingId` is still populated.

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LogPage.jsx
git commit -m "feat: prefill Quick Log from notification deep-link query params"
```

---

## Task 6: Backend — transaction-alert push helper (notifications.js)

**Files:**
- Create: `functions/src/notifications.js`
- Test: `functions/test/notifications.test.js`

- [ ] **Step 1: Write the failing test `functions/test/notifications.test.js`**

```js
const { buildTransactionMessage, makeSendTransactionAlert } = require('../src/notifications')

describe('buildTransactionMessage', () => {
  it('builds an FCM message with body, deep-link data, and token', () => {
    const msg = buildTransactionMessage({
      token: 'tok-1',
      amount: 24.5,
      merchantName: 'Chipotle',
      categoryId: 'food',
      pendingId: 'tx-1',
    })
    expect(msg.token).toBe('tok-1')
    expect(msg.notification.title).toBe('DollarSmart')
    expect(msg.notification.body).toBe('Looks like you spent $24.50 at Chipotle — log it?')
    expect(msg.data).toEqual({ amount: '24.5', categoryId: 'food', pendingId: 'tx-1' })
  })
})

describe('makeSendTransactionAlert', () => {
  function fakeDb(userDocs) {
    return {
      doc(path) {
        return { get: async () => {
          const data = userDocs[path]
          return { exists: data !== undefined, data: () => data }
        } }
      },
    }
  }

  it('sends a push when the user is opted in and has a token', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { fcmToken: 'tok-1', notificationPrefs: { transactionAlert: true } } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 5, merchantName: 'Uber', categoryId: 'transport', transaction_id: 'tx-9' }, 'tx-9')
    expect(sent).toHaveLength(1)
    expect(sent[0].token).toBe('tok-1')
    expect(sent[0].data.pendingId).toBe('tx-9')
  })

  it('does not send when the user opted out of transactionAlert', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { fcmToken: 'tok-1', notificationPrefs: { transactionAlert: false } } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 5, merchantName: 'Uber', categoryId: 'transport' }, 'tx-9')
    expect(sent).toHaveLength(0)
  })

  it('does not send when the user has no token', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { notificationPrefs: { transactionAlert: true } } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 5, merchantName: 'Uber', categoryId: 'transport' }, 'tx-9')
    expect(sent).toHaveLength(0)
  })

  it('defaults transactionAlert to ON when prefs are absent', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { fcmToken: 'tok-1' } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 5, merchantName: 'Uber', categoryId: 'transport' }, 'tx-9')
    expect(sent).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix functions test -- notifications`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/src/notifications.js`**

```js
function buildTransactionMessage({ token, amount, merchantName, categoryId, pendingId }) {
  return {
    token,
    notification: {
      title: 'DollarSmart',
      body: `Looks like you spent $${Number(amount).toFixed(2)} at ${merchantName} — log it?`,
    },
    data: {
      amount: String(amount),
      categoryId: String(categoryId),
      pendingId: String(pendingId),
    },
  }
}

/**
 * Returns send(uid, tx, pendingId): looks up the user's fcmToken and
 * transactionAlert preference (default ON) and sends a push if eligible.
 * Failures (e.g. stale token) are swallowed so webhook processing continues.
 */
function makeSendTransactionAlert({ db, messaging }) {
  return async function (uid, tx, pendingId) {
    const snap = await db.doc(`users/${uid}`).get()
    const user = snap.exists ? snap.data() : {}
    const token = user.fcmToken
    const wantsAlert = user.notificationPrefs ? user.notificationPrefs.transactionAlert !== false : true
    if (!token || !wantsAlert) return
    try {
      await messaging.send(buildTransactionMessage({
        token,
        amount: tx.amount,
        merchantName: tx.merchant_name || tx.name || 'Unknown',
        categoryId: tx.categoryId,
        pendingId,
      }))
    } catch (err) {
      console.error('failed to send transaction alert', err)
    }
  }
}

module.exports = { buildTransactionMessage, makeSendTransactionAlert }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix functions test -- notifications`
Expected: PASS — all cases.

- [ ] **Step 5: Commit**

```bash
git add functions/src/notifications.js functions/test/notifications.test.js
git commit -m "feat: add transaction-alert push helper with opt-out and token checks"
```

---

## Task 7: Backend — wire push into the Plaid webhook

**Files:**
- Modify: `functions/src/handlers/plaidWebhook.js`
- Modify: `functions/test/plaidWebhook.test.js`

- [ ] **Step 1: Update the test `functions/test/plaidWebhook.test.js`**

Add a `sendAlert` spy to the existing `makeProcessTransactionsSync` test and assert it's called per added tx. Replace the first test ('writes a pending transaction per added tx and advances the cursor') with:

```js
  it('writes a pending transaction, sends an alert, and advances the cursor', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const alerts = []
    const fakePlaid = {
      transactionsSync: async () => ({
        data: {
          added: [
            { transaction_id: 'tx-1', amount: 24.5, merchant_name: 'Chipotle', date: '2026-06-13',
              personal_finance_category: { primary: 'FOOD_AND_DRINK' } },
          ],
          has_more: false,
          next_cursor: 'cursor-2',
        },
      }),
    }
    const process = makeProcessTransactionsSync({
      db, getPlaidClient: () => fakePlaid, merchantToCategory: () => 'food',
      sendAlert: async (uid, tx, pendingId) => { alerts.push({ uid, pendingId, categoryId: tx.categoryId }) },
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-1'].data).toMatchObject({
      uid: 'u1', amount: 24.5, merchantName: 'Chipotle', categoryId: 'food',
      date: '2026-06-13', status: 'pending',
    })
    expect(db.writes['plaidItems/u1'].data.cursor).toBe('cursor-2')
    expect(alerts).toEqual([{ uid: 'u1', pendingId: 'tx-1', categoryId: 'food' }])
  })
```

Update the second test ('does nothing when the item is unknown') to pass a noop `sendAlert`:
```js
    const process = makeProcessTransactionsSync({
      db, getPlaidClient: () => ({}), merchantToCategory: () => 'other', sendAlert: async () => {},
    })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix functions test -- plaidWebhook`
Expected: FAIL — `sendAlert` is not called / undefined.

- [ ] **Step 3: Update `makeProcessTransactionsSync` in `functions/src/handlers/plaidWebhook.js`**

Change the signature and call `sendAlert` after each pending write. Replace the function with:

```js
// Testable core: pull new transactions for an item, write pending docs, and
// fire a per-transaction push alert.
function makeProcessTransactionsSync({ db, getPlaidClient, merchantToCategory, sendAlert }) {
  return async function (itemId) {
    const item = await db.findItemByItemId(itemId)
    if (!item) return
    const plaid = getPlaidClient()

    let cursor = item.data.cursor || undefined
    let hasMore = true
    while (hasMore) {
      const res = await plaid.transactionsSync({ access_token: item.data.accessToken, cursor })
      const { added, has_more: more, next_cursor: next } = res.data
      for (const tx of added) {
        // Plaid uses positive amounts for outflow (spending) and negative for
        // inflow (refunds, payments received). Only prompt to log spending.
        if (!(tx.amount > 0)) continue
        const categoryId = merchantToCategory(
          tx.merchant_name || tx.name,
          tx.personal_finance_category && tx.personal_finance_category.primary,
        )
        await db.doc(`pendingTransactions/${tx.transaction_id}`).set({
          uid: item.uid,
          amount: tx.amount,
          merchantName: tx.merchant_name || tx.name || 'Unknown',
          categoryId,
          date: tx.date,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        await sendAlert(item.uid, { ...tx, categoryId }, tx.transaction_id)
      }
      cursor = next
      hasMore = more
      // Persist the cursor after each page so a mid-pagination failure resumes
      // forward on Plaid's retry instead of re-processing earlier pages.
      await db.doc(`plaidItems/${item.uid}`).set({ cursor: cursor || null }, { merge: true })
    }
  }
}
```

- [ ] **Step 4: Wire the real `sendAlert` into the HTTP handler**

Add the import near the other requires:
```js
const { makeSendTransactionAlert } = require('../notifications')
```

In the `onRequest` handler, where `makeProcessTransactionsSync` is constructed for the TRANSACTIONS branch, pass a real `sendAlert`:
```js
        const sendAlert = makeSendTransactionAlert({ db, messaging: admin.messaging() })
        const process = makeProcessTransactionsSync({ db, getPlaidClient, merchantToCategory, sendAlert })
        await process(itemId)
```

- [ ] **Step 5: Run the full functions suite**

Run: `npm --prefix functions test`
Expected: PASS — smoke, categoryMap, createLinkToken, exchangePublicToken, webhookVerify, plaidWebhook, notifications.

- [ ] **Step 6: Commit**

```bash
git add functions/src/handlers/plaidWebhook.js functions/test/plaidWebhook.test.js
git commit -m "feat: send a push alert when the Plaid webhook detects a transaction"
```

---

## Task 8: Prerequisites, deploy, and two-phone verification

**Files:**
- Modify: `.env.local` (human — git-ignored)

- [ ] **Step 1: Generate the VAPID key (human, Firebase console)**

Go to Firebase console → **Project Settings → Cloud Messaging → Web Push certificates → Generate key pair**. Copy the key.
Add to `.env.local`:
```
VITE_FIREBASE_VAPID_KEY=<paste the key pair value>
```

- [ ] **Step 2: Rebuild so the client picks up the VAPID key**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Deploy the functions (transaction push)**

Run: `npx firebase deploy --only functions`
Expected: deploy succeeds; `plaidWebhook` updates.

- [ ] **Step 4: Deploy hosting / run the app and enable notifications**

Run the app (`npm run dev` over HTTPS, or deploy hosting). On each phone:
- Android (Alex): open the app, Settings → Notifications → **Enable notifications** → allow. Confirm `users/{uid}.fcmToken` appears in Firestore.
- iPhone (partner): the app must be installed to Home Screen first (the Phase 2 `IphoneInstallPrompt` covers this). Once installed and opened, Settings → Notifications → Enable → allow. Confirm the token writes.

- [ ] **Step 5: Fire a Sandbox transaction and confirm push**

Trigger a Sandbox `SYNC_UPDATES_AVAILABLE` webhook (as in Phase 5 Task 13). With the app **backgrounded**:
Expected: a push arrives — "Looks like you spent $X at Y — log it?". Tapping it opens the app at Quick Log pre-filled with the amount + category; saving clears the pending doc and adds the expense.

- [ ] **Step 6: Confirm opt-out**

In Settings, toggle **Transaction detected** off, fire another Sandbox webhook.
Expected: a `pendingTransactions` doc is still written (in-app banner appears) but **no push** is delivered.

- [ ] **Step 7: No commit (manual verification only)**

---

## Phase 6 Done — Definition of Complete

- [ ] `npm test` passes (adds notificationPrefs) and `npm --prefix functions test` passes (adds notifications, updated plaidWebhook)
- [ ] FCM service worker deployed; web app registers it and stores `fcmToken` on the user doc
- [ ] Settings has an enable-notifications flow with a clear denied state, plus per-type toggles
- [ ] iPhone path: install-to-Home-Screen prompt (Phase 2) gates notifications correctly; token writes after enabling in the installed PWA
- [ ] A detected Plaid transaction sends a push to the owning user (if opted in and tokened)
- [ ] Tapping the push opens a pre-filled Quick Log via query-param deep link; saving clears the pending doc
- [ ] Opting out of `transactionAlert` suppresses the push but keeps the in-app banner

**Next phase:** Phase 7 — remaining notification types (approaching-shared-target 80%, partner-logged-shared, daily catch-up nudge via scheduled function, weekly AI insight via Claude Haiku 4.5 over the Anthropic API), plus any visual polish. The weekly AI insight needs an `ANTHROPIC_API_KEY` secret and a small ongoing spend.
```
