const { onSchedule } = require('firebase-functions/v2/scheduler')
const admin = require('firebase-admin')
const { buildMonthlyRecapMessage } = require('../notifications')

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const CATEGORY_LABELS = {
  groceries: 'Groceries', food: 'Food', transport: 'Transport', shopping: 'Shopping',
  entertainment: 'Entertainment', bills: 'Bills', health: 'Health', travel: 'Travel',
  pets: 'Pets', other: 'Other',
}

// Build a short recap of a month's own expenses/income. Testable (no Firebase).
function generateRecapSummary({ expenses, monthName }) {
  let expenseTotal = 0
  let incomeTotal = 0
  let count = 0
  const byCategory = {}
  for (const e of expenses) {
    if (e.type === 'income') { incomeTotal += e.amount; continue }
    expenseTotal += e.amount
    count += 1
    byCategory[e.categoryId] = (byCategory[e.categoryId] || 0) + e.amount
  }
  const top = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]
  const net = incomeTotal - expenseTotal
  const topPart = top ? `, most on ${CATEGORY_LABELS[top[0]] || 'Other'} ($${top[1].toFixed(0)})` : ''
  const netPart = `Net ${net >= 0 ? '+' : '−'}$${Math.abs(net).toFixed(0)}.`
  return `${monthName}: spent $${expenseTotal.toFixed(0)} on ${count} purchase${count === 1 ? '' : 's'}${topPart}. ${netPart}`
}

const monthlyRecap = onSchedule('0 9 1 * *', async () => {
  const fs = admin.firestore()
  const messaging = admin.messaging()
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthName = MONTH_NAMES[lastMonthStart.getMonth()]

  const usersSnap = await fs.collection('users').get()
  await Promise.all(usersSnap.docs.map(async (u) => {
    const user = u.data()
    if (!user.fcmToken) return
    if (user.notificationPrefs?.monthlyRecap === false) return
    const expSnap = await fs.collection('expenses')
      .where('uid', '==', u.id)
      .where('date', '>=', lastMonthStart)
      .where('date', '<', thisMonthStart)
      .get()
    const expenses = expSnap.docs.map((d) => d.data())
    if (expenses.length === 0) return
    const summary = generateRecapSummary({ expenses, monthName })
    await messaging.send(buildMonthlyRecapMessage({ token: user.fcmToken, monthName, summary }))
  }))
})

module.exports = { monthlyRecap, generateRecapSummary }
