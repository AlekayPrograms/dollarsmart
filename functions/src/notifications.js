// DATA-ONLY messages. The service worker's onBackgroundMessage explicitly calls
// showNotification — this is required on iOS Safari PWAs (FCM's auto-display
// does not fire there) and avoids the Android double (data-only doesn't
// auto-display, so only our SW shows it). `data` values must be strings.
// `path` is the tap target; transaction prompts carry tx fields and open Log.

function buildTransactionMessage({ token, amount, merchantName = '', categoryId, pendingId, date }) {
  return {
    token,
    data: {
      title: 'DollarSmart',
      body: `Looks like you spent $${Number(amount).toFixed(2)} at ${merchantName} — log it?`,
      amount: String(amount),
      categoryId: String(categoryId),
      entryType: 'expense',
      pendingId: String(pendingId),
      ...(date ? { date: String(date) } : {}),
      ...(merchantName ? { merchantName: String(merchantName) } : {}),
    },
  }
}

function buildIncomeMessage({ token, amount, merchantName = '', pendingId, date }) {
  const from = merchantName ? ` from ${merchantName}` : ''
  return {
    token,
    data: {
      title: 'DollarSmart',
      body: `Received $${Number(amount).toFixed(2)}${from} — log as income?`,
      amount: String(amount),
      categoryId: 'other',
      entryType: 'income',
      pendingId: String(pendingId),
      ...(date ? { date: String(date) } : {}),
      ...(merchantName ? { merchantName: String(merchantName) } : {}),
    },
  }
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
  return {
    token,
    data: { title: 'DollarSmart', body: `Partner logged $${Number(amount).toFixed(2)} on ${label} (${pool})`, path: '/expenses' },
  }
}

function buildDailyNudgeMessage({ token }) {
  return { token, data: { title: 'DollarSmart', body: "Don't forget to log today's expenses!", path: '/log' } }
}

function buildWeeklyInsightMessage({ token, insight }) {
  return { token, data: { title: 'Weekly spending insight', body: insight, path: '/insights' } }
}

function buildRemovalVoteMessage({ token }) {
  return { token, data: { title: 'DollarSmart', body: 'Your partner wants to remove a split expense — open the app to confirm', path: '/expenses' } }
}

function buildRemovalCompleteMessage({ token }) {
  return { token, data: { title: 'DollarSmart', body: 'A split expense was removed (you both agreed)', path: '/expenses' } }
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
