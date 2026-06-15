// Pure helpers for the Insights page. They take plain expense objects
// (type, amount, categoryId, date) and never touch Firestore directly.

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Normalize a stored date (Firestore Timestamp | Date | string) to a Date.
function toDate(date) {
  if (!date) return null
  const d = date.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Total expense spending for each of the last `months` calendar months,
 * oldest first. Income is excluded.
 * @returns {{ key: string, label: string, total: number }[]}
 */
export function monthlyTotals(expenses, months = 6, now = new Date()) {
  const buckets = []
  const index = new Map()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = { key, label: MONTH_LABELS[d.getMonth()], total: 0 }
    buckets.push(bucket)
    index.set(key, bucket)
  }
  for (const e of expenses) {
    if (e.type === 'income') continue
    const d = toDate(e.date)
    if (!d) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = index.get(key)
    if (bucket) bucket.total += e.amount
  }
  return buckets
}

/**
 * Spending per category, largest first, with each share as a 0–1 fraction of
 * the total. Income is excluded. Categories with zero spend are omitted.
 * @returns {{ categoryId: string, total: number, pct: number }[]}
 */
export function categoryBreakdown(expenses) {
  const sums = {}
  let grand = 0
  for (const e of expenses) {
    if (e.type === 'income') continue
    sums[e.categoryId] = (sums[e.categoryId] ?? 0) + e.amount
    grand += e.amount
  }
  return Object.entries(sums)
    .map(([categoryId, total]) => ({ categoryId, total, pct: grand > 0 ? total / grand : 0 }))
    .sort((a, b) => b.total - a.total)
}
