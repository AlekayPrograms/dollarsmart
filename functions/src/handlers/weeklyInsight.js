const { onSchedule } = require('firebase-functions/v2/scheduler')
const admin = require('firebase-admin')
const Anthropic = require('@anthropic-ai/sdk')
const { buildWeeklyInsightMessage } = require('../notifications')

const ANTHROPIC_API_KEY = 'ANTHROPIC_API_KEY'

const CATEGORY_LABELS = {
  groceries: 'Groceries', food: 'Food & Dining', transport: 'Transport',
  shopping: 'Shopping', entertainment: 'Entertainment', bills: 'Bills',
  health: 'Health', travel: 'Travel', pets: 'Pets', other: 'Other',
}

async function generateInsight({ expenses, splitTotal }) {
  const byCategory = {}
  for (const e of expenses) {
    if (e.type === 'income') continue
    const label = CATEGORY_LABELS[e.categoryId] || 'Other'
    byCategory[label] = (byCategory[label] || 0) + e.amount
  }
  const totalSpent = Object.values(byCategory).reduce((s, v) => s + v, 0)
  const categoryLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([label, amt]) => `- ${label}: $${amt.toFixed(2)}`)
    .join('\n')

  const prompt = `You are a friendly personal finance assistant for a couple. Write a 1-2 sentence spending insight from this week's data. Be encouraging and specific with numbers. Keep the total response under 180 characters.

This week:
Total spent: $${totalSpent.toFixed(2)}
${categoryLines}
Split (shared) spending this month: $${splitTotal.toFixed(2)}`

  const client = new Anthropic({ apiKey: process.env[ANTHROPIC_API_KEY] })
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  })
  return msg.content[0].text.trim()
}

const weeklyInsight = onSchedule(
  { schedule: '0 8 * * 1', secrets: [ANTHROPIC_API_KEY] },
  async () => {
    const fs = admin.firestore()
    const messaging = admin.messaging()

    const householdsSnap = await fs.collection('households').get()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    await Promise.all(householdsSnap.docs.map(async (householdDoc) => {
      const household = householdDoc.data()
      const memberUids = household.memberUids || []
      if (memberUids.length === 0) return

      const [weekExpensesSnap, monthExpensesSnap] = await Promise.all([
        fs.collection('expenses')
          .where('householdId', '==', householdDoc.id)
          .where('date', '>=', weekAgo)
          .get(),
        fs.collection('expenses')
          .where('householdId', '==', householdDoc.id)
          .where('date', '>=', (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })())
          .get(),
      ])

      const expenses = weekExpensesSnap.docs.map((d) => d.data())
      if (expenses.filter((e) => e.type === 'expense').length === 0) return

      const splitTotal = monthExpensesSnap.docs
        .map((d) => d.data())
        .filter((e) => e.type === 'expense' && e.poolType === 'split')
        .reduce((sum, e) => sum + e.amount, 0)

      let insight
      try {
        insight = await generateInsight({ expenses, splitTotal })
      } catch (err) {
        console.error('Weekly insight generation failed:', err.message)
        return
      }

      await Promise.all(memberUids.map(async (uid) => {
        const userSnap = await fs.doc(`users/${uid}`).get()
        if (!userSnap.exists) return
        const user = userSnap.data()
        if (!user.fcmToken) return
        if (user.notificationPrefs?.weeklyInsight === false) return
        await messaging.send(buildWeeklyInsightMessage({ token: user.fcmToken, insight }))
      }))
    }))
  },
)

module.exports = { weeklyInsight, generateInsight }
