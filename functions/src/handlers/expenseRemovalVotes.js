const { onDocumentUpdated } = require('firebase-functions/v2/firestore')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { buildRemovalVoteMessage, buildRemovalCompleteMessage } = require('../notifications')

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
    async deleteExpense(expenseId) {
      await fs.doc(`expenses/${expenseId}`).delete()
    },
    async adjustBalance(uid, delta) {
      if (!uid || !delta) return
      await fs.doc(`users/${uid}`).set({ bankBalance: FieldValue.increment(delta) }, { merge: true })
    },
  }
}

const everyVoted = (members, votes) => members.length > 0 && members.every((u) => votes[u])

// How much to give back to the owner's balance when a shared expense is
// removed: the reverse of what logging it applied (expense subtracted, income
// added).
function reversalDelta(expense) {
  return expense.type === 'income' ? -expense.amount : expense.amount
}

/**
 * Core logic (injectable db/messaging) for the removal-vote trigger.
 * - When both partners have just voted: delete the expense, give the owner's
 *   balance back, and tell everyone it was removed.
 * - When a new vote arrives but it isn't unanimous yet: nudge the members who
 *   still need to confirm.
 */
async function handleRemovalVotes({ db, messaging, expenseId, before, after }) {
  if (!after) return
  if (after.poolType !== 'shared' && after.poolType !== 'split') return

  const household = await db.getHousehold(after.householdId)
  if (!household) return
  const members = household.memberUids || []
  const beforeVotes = (before && before.removalVotes) || {}
  const afterVotes = after.removalVotes || {}

  if (everyVoted(members, afterVotes) && !everyVoted(members, beforeVotes)) {
    await db.deleteExpense(expenseId)
    await db.adjustBalance(after.uid, reversalDelta(after))
    await Promise.all(members.map(async (uid) => {
      const u = await db.getUser(uid)
      if (!u || !u.fcmToken) return
      if (u.notificationPrefs && u.notificationPrefs.partnerActivity === false) return
      await messaging.send(buildRemovalCompleteMessage({ token: u.fcmToken }))
    }))
    return
  }

  // A new (non-unanimous) vote — ask the members who haven't voted to confirm.
  const newVoter = Object.keys(afterVotes).some((u) => afterVotes[u] && !beforeVotes[u])
  if (newVoter) {
    const pending = members.filter((u) => !afterVotes[u])
    await Promise.all(pending.map(async (uid) => {
      const u = await db.getUser(uid)
      if (!u || !u.fcmToken) return
      if (u.notificationPrefs && u.notificationPrefs.partnerActivity === false) return
      await messaging.send(buildRemovalVoteMessage({ token: u.fcmToken }))
    }))
  }
}

const expenseRemovalVotes = onDocumentUpdated('expenses/{expenseId}', async (event) => {
  const before = event.data.before.exists ? event.data.before.data() : null
  const after = event.data.after.exists ? event.data.after.data() : null
  await handleRemovalVotes({
    db: adminDbAdapter(),
    messaging: admin.messaging(),
    expenseId: event.params.expenseId,
    before,
    after,
  })
})

module.exports = { expenseRemovalVotes, handleRemovalVotes, reversalDelta, everyVoted }
