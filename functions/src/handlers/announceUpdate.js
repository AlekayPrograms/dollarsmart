// TEMPORARY one-off broadcast. Sends a single "app updated" announcement to
// every user that has an FCM token, then is deleted. Secret-guarded so the
// public Cloud Run URL can't be triggered by anyone else. Remove after firing.
const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')

const SECRET = '1ce248351f81fc7c71b7ca00b07841ceead23a0a6346032f'

const ANNOUNCEMENT = {
  title: 'DollarSmart',
  body: 'The app has been updated with a new look and feel. Tap to check it out!',
  path: '/',
}

const announceUpdate = onRequest(async (req, res) => {
  const key = req.get('x-broadcast-key') || req.query.key
  if (key !== SECRET) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  const fs = admin.firestore()
  const usersSnap = await fs.collection('users').where('fcmToken', '!=', null).get()
  const tokens = usersSnap.docs.map((d) => d.data().fcmToken).filter(Boolean)

  if (tokens.length === 0) {
    res.json({ recipients: 0, successCount: 0, failureCount: 0, note: 'no tokens' })
    return
  }

  let successCount = 0
  let failureCount = 0
  // sendEachForMulticast handles up to 500 tokens per call.
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500)
    const resp = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      data: ANNOUNCEMENT,
    })
    successCount += resp.successCount
    failureCount += resp.failureCount
  }

  res.json({ recipients: tokens.length, successCount, failureCount })
})

module.exports = { announceUpdate }
