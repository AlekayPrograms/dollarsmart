const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')

// The household leader (creator) removes another member: drop them from the
// household and clear their householdId (which only the Admin SDK can do, since
// a client can't write another user's doc).
const kickMember = onCall(async (request) => {
  const auth = request.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const targetUid = request.data && request.data.memberUid
  if (!targetUid) throw new HttpsError('invalid-argument', 'memberUid is required.')
  if (targetUid === auth.uid) throw new HttpsError('failed-precondition', 'Use "Leave household" to remove yourself.')

  const fs = admin.firestore()
  const userSnap = await fs.doc(`users/${auth.uid}`).get()
  const householdId = userSnap.exists && userSnap.data().householdId
  if (!householdId) throw new HttpsError('failed-precondition', 'You are not in a household.')

  const hhRef = fs.doc(`households/${householdId}`)
  const hhSnap = await hhRef.get()
  if (!hhSnap.exists) throw new HttpsError('not-found', 'Household not found.')
  const hh = hhSnap.data()
  const members = hh.memberUids || []
  const leader = hh.createdBy || members[0]
  if (leader !== auth.uid) throw new HttpsError('permission-denied', 'Only the household leader can remove members.')
  if (!members.includes(targetUid)) throw new HttpsError('not-found', 'That person is not in the household.')

  await hhRef.update({
    memberUids: FieldValue.arrayRemove(targetUid),
    [`members.${targetUid}`]: FieldValue.delete(),
  })
  await fs.doc(`users/${targetUid}`).set({ householdId: null }, { merge: true })
  return { ok: true }
})

module.exports = { kickMember }
