const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')
const { buildPartnerActivityMessage, buildApproachingTargetMessage } = require('../notifications')

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
    async getMonthSharedTotal(householdId, monthStart) {
      const snap = await fs.collection('expenses')
        .where('householdId', '==', householdId)
        .where('date', '>=', monthStart)
        .get()
      return snap.docs
        .map((d) => d.data())
        .filter((e) => e.type === 'expense' && (e.poolType === 'shared' || e.poolType === 'split'))
        .reduce((sum, e) => sum + e.amount, 0)
    },
  }
}

async function handlePartnerActivity({ db, messaging, expense }) {
  if (expense.type !== 'expense') return
  if (expense.poolType !== 'shared' && expense.poolType !== 'split') return

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

async function handleApproachingTarget({ db, messaging, expense }) {
  if (expense.type !== 'expense') return
  if (expense.poolType !== 'shared' && expense.poolType !== 'split') return

  const household = await db.getHousehold(expense.householdId)
  if (!household) return

  const totalTarget = Object.values(household.sharedTargets || {})
    .reduce((sum, v) => sum + (Number(v) || 0), 0)
  if (totalTarget <= 0) return

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalAfter = await db.getMonthSharedTotal(expense.householdId, monthStart)
  const totalBefore = totalAfter - expense.amount

  // Fire once when crossing 80% or 100%
  for (const threshold of [0.8, 1.0]) {
    if (totalAfter / totalTarget >= threshold && totalBefore / totalTarget < threshold) {
      const percent = Math.round(threshold * 100)
      await Promise.all((household.memberUids || []).map(async (uid) => {
        const u = await db.getUser(uid)
        if (!u?.fcmToken) return
        if (u.notificationPrefs?.approachingTarget === false) return
        await messaging.send(buildApproachingTargetMessage({ token: u.fcmToken, percent }))
      }))
      break
    }
  }
}

const expenseTrigger = onDocumentCreated('expenses/{expenseId}', async (event) => {
  const expense = event.data.data()
  if (!expense.householdId) return
  const db = adminDbAdapter()
  const messaging = admin.messaging()
  await Promise.all([
    handlePartnerActivity({ db, messaging, expense }),
    handleApproachingTarget({ db, messaging, expense }),
  ])
})

module.exports = { expenseTrigger, handlePartnerActivity, handleApproachingTarget }
