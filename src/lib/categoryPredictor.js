function toMs(date) {
  if (!date) return 0
  if (date.toDate) return date.toDate().getTime()
  return new Date(date).getTime()
}

export function predictCategory(expenses, merchantName, now = new Date()) {
  if (!merchantName || !merchantName.trim()) return null

  const cutoff = now.getTime() - 60 * 86400000
  const needle = merchantName.toLowerCase()
  const counts = {}

  for (const e of expenses) {
    if (!e.merchantName) continue
    if (toMs(e.date) < cutoff) continue
    const hay = e.merchantName.toLowerCase()
    if (!hay.includes(needle) && !needle.includes(hay)) continue
    counts[e.categoryId] = (counts[e.categoryId] ?? 0) + 1
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!entries.length || entries[0][1] < 2) return null
  return entries[0][0]
}
