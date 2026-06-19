const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

const TEST_MESSAGES = (token) => [
  {
    token,
    data: {
      title: 'DollarSmart (test)', body: 'Test transaction — tap to open Log',
      amount: '1.23', categoryId: 'food', entryType: 'expense',
      pendingId: 'test-do-not-save', merchantName: 'Test Merchant',
    },
  },
  {
    token,
    data: { title: 'DollarSmart (test)', body: 'Test split notification — tap to open Expenses', path: '/expenses' },
  },
]

// TEMPORARY. Sends two DATA-ONLY test pushes to every member of the given
// user's household (so we can test both phones). Reports per member whether a
// notification token is registered. Remove after testing.
const testNotify = onRequest(async (req, res) => {
  if (req.query.key !== 'test-notify') { res.status(403).send('forbidden'); return }
  const uid = req.query.uid
  if (!uid) { res.status(400).send('uid required'); return }
  const fs = admin.firestore()
  const messaging = admin.messaging()

  const userSnap = await fs.doc(`users/${uid}`).get()
  const householdId = userSnap.exists && userSnap.data().householdId
  if (!householdId) { res.status(200).json({ ok: false, reason: 'no household' }); return }
  const hh = await fs.doc(`households/${householdId}`).get()
  const members = (hh.exists && hh.data().memberUids) || []

  const report = []
  for (const mUid of members) {
    const snap = await fs.doc(`users/${mUid}`).get()
    const token = snap.exists && snap.data().fcmToken
    if (!token) { report.push({ uid: mUid, tokenPresent: false }); continue }
    try {
      for (const msg of TEST_MESSAGES(token)) await messaging.send(msg)
      report.push({ uid: mUid, tokenPresent: true, sent: 2 })
    } catch (err) {
      report.push({ uid: mUid, tokenPresent: true, error: err.message || String(err) })
    }
  }
  res.status(200).json({ ok: true, householdId, report })
})

module.exports = { testNotify }
