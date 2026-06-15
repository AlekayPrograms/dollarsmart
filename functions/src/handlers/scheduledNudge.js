const { onSchedule } = require('firebase-functions/v2/scheduler')
const admin = require('firebase-admin')
const { buildDailyNudgeMessage } = require('../notifications')

// Runs every hour. Nudge times are stored as 'HH:MM' and treated as UTC.
const scheduledNudge = onSchedule('0 * * * *', async () => {
  const fs = admin.firestore()
  const now = new Date()
  const currentHour = now.getUTCHours()

  const usersSnap = await fs.collection('users').where('fcmToken', '!=', null).get()

  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  await Promise.all(usersSnap.docs.map(async (userDoc) => {
    const user = userDoc.data()
    if (!user.notificationPrefs?.dailyNudge) return
    if (!user.fcmToken) return

    const nudgeTime = user.notificationPrefs.nudgeTime || '20:00'
    const nudgeHour = Number(nudgeTime.split(':')[0])
    if (nudgeHour !== currentHour) return

    const expensesSnap = await fs.collection('expenses')
      .where('uid', '==', userDoc.id)
      .where('date', '>=', todayStart)
      .limit(1)
      .get()
    if (!expensesSnap.empty) return

    await admin.messaging().send(buildDailyNudgeMessage({ token: user.fcmToken }))
  }))
})

module.exports = { scheduledNudge }
