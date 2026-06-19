// Cross-platform FCM web push. Each message carries:
//  - notification {title, body}: required for iOS web push to display at all
//    (iOS drops data-only/"silent" pushes), and shown once by FCM.
//  - webpush.fcmOptions.link: where a tap should land (FCM opens it).
//  - data: kept for any in-app/foreground use.
// The service worker does NOT call showNotification (that double-displayed on
// Android); FCM auto-displays the single notification and handles the click.

function msg({ token, title, body, link, data = {} }) {
  return {
    token,
    notification: { title, body },
    data: { title, body, ...data },
    webpush: {
      fcmOptions: { link },
      notification: { title, body, icon: '/pwa-192x192.png' },
    },
  }
}

function logLink(fields) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  return `/log?${params.toString()}`
}

function buildTransactionMessage({ token, amount, merchantName = '', categoryId, pendingId, date }) {
  return msg({
    token,
    title: 'DollarSmart',
    body: `Looks like you spent $${Number(amount).toFixed(2)} at ${merchantName} — log it?`,
    link: logLink({ amount, categoryId, entryType: 'expense', pendingId, date, merchantName }),
    data: { amount: String(amount), categoryId: String(categoryId), entryType: 'expense', pendingId: String(pendingId), date, merchantName },
  })
}

function buildIncomeMessage({ token, amount, merchantName = '', pendingId, date }) {
  const from = merchantName ? ` from ${merchantName}` : ''
  return msg({
    token,
    title: 'DollarSmart',
    body: `Received $${Number(amount).toFixed(2)}${from} — log as income?`,
    link: logLink({ amount, categoryId: 'other', entryType: 'income', pendingId, date, merchantName }),
    data: { amount: String(amount), categoryId: 'other', entryType: 'income', pendingId: String(pendingId), date, merchantName },
  })
}

function makeSendTransactionAlert({ db, messaging }) {
  return async function (uid, tx, pendingId) {
    const snap = await db.doc(`users/${uid}`).get()
    const user = snap.exists ? snap.data() : {}
    const token = user.fcmToken
    const wantsAlert = user.notificationPrefs ? user.notificationPrefs.transactionAlert !== false : true
    if (!token || !wantsAlert) return
    try {
      const merchantName = tx.merchant_name || tx.merchantName || tx.name || ''
      const m = tx.entryType === 'income'
        ? buildIncomeMessage({ token, amount: tx.amount, merchantName, pendingId, date: tx.date })
        : buildTransactionMessage({ token, amount: tx.amount, merchantName, categoryId: tx.categoryId, pendingId, date: tx.date })
      await messaging.send(m)
    } catch (err) {
      console.error('FCM send failed:', err.message || err)
    }
  }
}

const CATEGORY_LABELS = {
  groceries: 'groceries', food: 'food', transport: 'transport',
  shopping: 'shopping', entertainment: 'entertainment', bills: 'bills',
  health: 'health', travel: 'travel', pets: 'pets', other: 'something',
}

function buildPartnerActivityMessage({ token, amount, categoryId, poolType }) {
  const label = CATEGORY_LABELS[categoryId] || 'something'
  const pool = poolType === 'split' ? 'split' : 'shared'
  return msg({
    token,
    title: 'DollarSmart',
    body: `Partner logged $${Number(amount).toFixed(2)} on ${label} (${pool})`,
    link: '/expenses',
  })
}

function buildDailyNudgeMessage({ token }) {
  return msg({ token, title: 'DollarSmart', body: "Don't forget to log today's expenses!", link: '/log' })
}

function buildWeeklyInsightMessage({ token, insight }) {
  return msg({ token, title: 'Weekly spending insight', body: insight, link: '/insights' })
}

function buildRemovalVoteMessage({ token }) {
  return msg({ token, title: 'DollarSmart', body: 'Your partner wants to remove a split expense — open the app to confirm', link: '/expenses' })
}

function buildRemovalCompleteMessage({ token }) {
  return msg({ token, title: 'DollarSmart', body: 'A split expense was removed (you both agreed)', link: '/expenses' })
}

module.exports = {
  buildTransactionMessage,
  buildIncomeMessage,
  makeSendTransactionAlert,
  buildPartnerActivityMessage,
  buildDailyNudgeMessage,
  buildWeeklyInsightMessage,
  buildRemovalVoteMessage,
  buildRemovalCompleteMessage,
}
