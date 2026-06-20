function toMs(date) {
  if (!date) return 0
  if (date.toDate) return date.toDate().getTime()
  return new Date(date).getTime()
}

function startOfDay(now) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Stable identity for a chip: brand + rounded amount, case-insensitive + trimmed.
export function chipKey(merchantName, amount) {
  return `${String(merchantName).trim().toLowerCase()}:${amount}`
}

// Quick-log chips, grouped by brand + rounded amount and ranked by how often
// you've logged them (personal expenses, last 90 days). Only transactions that
// carry a merchant/brand name qualify, so each chip can autofill the brand.
// A chip is dropped if it was already logged today, or if its key is in
// `dismissed`. The chip keeps `categoryId` so the UI can show the category icon.
export function getQuickLogChips(expenses, now = new Date(), limit = 3, dismissed = new Set()) {
  const nowMs = now.getTime ? now.getTime() : new Date(now).getTime()
  const cutoff = nowMs - 90 * 86400000
  const todayStart = startOfDay(now)
  const groups = {}

  for (const e of expenses) {
    if (e.type !== 'expense') continue
    const merchant = (e.merchantName || '').trim()
    if (!merchant) continue
    const t = toMs(e.date)
    if (t < cutoff) continue

    // Group near-equal amounts together by rounding the KEY only — the chip
    // keeps the exact (most recent) amount so logging never drops cents.
    const key = chipKey(merchant, Math.round(e.amount))
    if (!groups[key]) {
      groups[key] = { key, merchantName: merchant, categoryId: e.categoryId, amount: e.amount, count: 0, latest: 0, loggedToday: false }
    }
    const g = groups[key]
    g.count++
    if (t >= todayStart) g.loggedToday = true
    // Show the freshest brand spelling, category, and exact amount for this group.
    if (t >= g.latest) { g.latest = t; g.merchantName = merchant; g.categoryId = e.categoryId; g.amount = e.amount }
  }

  return Object.values(groups)
    .filter((g) => g.count >= 2 && !g.loggedToday && !dismissed.has(g.key))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ key, merchantName, categoryId, amount, count }) => ({ key, merchantName, categoryId, amount, count }))
}
