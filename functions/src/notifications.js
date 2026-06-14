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
        merchantName: tx.merchant_name || tx.merchantName || tx.name || 'Unknown',
        categoryId: tx.categoryId,
        pendingId,
      }))
    } catch (err) {
      console.error('failed to send transaction alert', err)
    }
  }
}

module.exports = { buildTransactionMessage, makeSendTransactionAlert }
