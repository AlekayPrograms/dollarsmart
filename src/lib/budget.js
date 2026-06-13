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
