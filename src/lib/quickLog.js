function toMs(date) {
  if (!date) return 0
  if (date.toDate) return date.toDate().getTime()
  return new Date(date).getTime()
}

export function getQuickLogChips(expenses, now = new Date(), limit = 3) {
  const cutoff = now.getTime() - 90 * 86400000
  const counts = {}

  for (const e of expenses) {
    if (e.type !== 'expense' || e.poolType !== 'personal') continue
    if (toMs(e.date) < cutoff) continue
    const amount = Math.round(e.amount)
    const key = `${e.categoryId}:${amount}`
    if (!counts[key]) counts[key] = { categoryId: e.categoryId, amount, count: 0 }
    counts[key].count++
  }

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
