export function sumByCategory(expenses) {
  const out = {}
  for (const e of expenses) {
    if (e.type === 'income') continue
    out[e.categoryId] = (out[e.categoryId] ?? 0) + e.amount
  }
  return out
}

export function sumByPool(expenses) {
  const out = {}
  for (const e of expenses) {
    if (e.type === 'income') continue
    out[e.poolType] = (out[e.poolType] ?? 0) + e.amount
  }
  return out
}

export function budgetProgress(spent, target) {
  if (!target || target <= 0) return { ratio: 0, status: 'none' }
  const ratio = spent / target
  let status = 'ok'
  if (ratio > 1) status = 'over'
  else if (ratio >= 0.8) status = 'warn'
  return { ratio, status }
}

// Returns { left, total, spent, pct } for the hero card, or null if no targets set.
// Only spending in targeted categories counts toward the total — unbudgeted categories
// are excluded so the hero number is honest.
export function leftToSpend(spentByCategory, targets) {
  const total = Object.values(targets).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const spent = Object.keys(targets).reduce((sum, catId) => {
    return sum + (spentByCategory[catId] ?? 0)
  }, 0)

  return {
    left: total - spent,
    total,
    spent,
    pct: Math.min(spent / total, 1),
  }
}
