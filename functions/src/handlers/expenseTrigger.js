const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')
const { buildPartnerActivityMessage } = require('../notifications')

function adminDbAdapter() {
  const fs = admin.firestore()
  return {
    async getHousehold(householdId) {
      const snap = await fs.doc(`households/${householdId}`).get()
      return snap.exists ? snap.data() : null
    },
    async getUser(uid) {
      const snap = await fs.doc(`users/${uid}`).get()
      return snap.exists ? snap.data() : null
    },
  }
}

// Notify the partner when a SPLIT expense is logged (split is the only shared
// mechanism). Personal expenses stay private and don't notify.
async function handlePartnerActivity({ db, messaging, expense }) {
  if (expense.type !== 'expense') return
  if (expense.poolType !== 'split') return

  const household = await db.getHousehold(expense.householdId)
  if (!household) return

  const partners = (household.memberUids || []).filter((uid) => uid !== expense.uid)
  await Promise.all(partners.map(async (uid) => {
    const partner = await db.getUser(uid)
    if (!partner?.fcmToken) return
    if (partner.notificationPrefs?.partnerActivity === false) return
    await messaging.send(buildPartnerActivityMessage({
      token: partner.fcmToken,
      amount: expense.amount,
      categoryId: expense.categoryId,
      poolType: expense.poolType,
    }))
  }))
}

const expenseTrigger = onDocumentCreated('expenses/{expenseId}', async (event) => {
  const expense = event.data.data()
  if (!expense.householdId) return
  await handlePartnerActivity({ db: adminDbAdapter(), messaging: admin.messaging(), expense })
})

module.exports = { expenseTrigger, handlePartnerActivity }
