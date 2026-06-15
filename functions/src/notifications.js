function buildTransactionMessage({ token, amount, merchantName = '', categoryId, pendingId, date }) {
  return {
    token,
    notification: {
      title: 'DollarSmart',
      body: `Looks like you spent $${Number(amount).toFixed(2)} at ${merchantName} — log it?`,
    },
    data: {
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
    notification: {
      title: 'DollarSmart',
      body: `Received $${Number(amount).toFixed(2)}${from} — log as income?`,
    },
    data: {
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
      const msg = tx.entryType === 'income'
        ? buildIncomeMessage({ token, amount: tx.amount, merchantName, pendingId, date: tx.date })
        : buildTransactionMessage({ token, amount: tx.amount, merchantName, categoryId: tx.categoryId, pendingId, date: tx.date })
      await messaging.send(msg)
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
    notification: {
      title: 'DollarSmart',
      body: `Partner logged $${Number(amount).toFixed(2)} on ${label} (${pool})`,
    },
    data: {},
  }
}

function buildApproachingTargetMessage({ token, percent }) {
  return {
    token,
    notification: {
      title: 'DollarSmart',
      body: `Heads up — you've used ${percent}% of your shared budget this month`,
    },
    data: {},
  }
}

function buildDailyNudgeMessage({ token }) {
  return {
    token,
    notification: {
      title: 'DollarSmart',
      body: "Don't forget to log today's expenses!",
    },
    data: {},
  }
}

function buildRemovalVoteMessage({ token }) {
  return {
    token,
    notification: {
      title: 'DollarSmart',
      body: 'Your partner wants to remove a shared expense — open the app to confirm',
    },
    data: {},
  }
}

function buildRemovalCompleteMessage({ token }) {
  return {
    token,
    notification: {
      title: 'DollarSmart',
      body: 'A shared expense was removed (you both agreed)',
    },
    data: {},
  }
}

function buildWeeklyInsightMessage({ token, insight }) {
  return {
    token,
    notification: {
      title: 'Weekly spending insight',
      body: insight,
    },
    data: {},
  }
}

module.exports = {
  buildTransactionMessage,
  buildIncomeMessage,
  makeSendTransactionAlert,
  buildPartnerActivityMessage,
  buildApproachingTargetMessage,
  buildDailyNudgeMessage,
  buildWeeklyInsightMessage,
  buildRemovalVoteMessage,
  buildRemovalCompleteMessage,
}
