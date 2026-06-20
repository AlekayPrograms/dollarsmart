function roundCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Net settle-up balance between two household members, from `meUid`'s point of view.
 *
 * Positive  → the partner owes you that much.
 * Negative  → you owe the partner that much.
 *
 * Only full-amount split expenses (`splitMode === 'full'`) participate: legacy
 * splits were recorded as the logger's half and carry no debt, so they're skipped.
 * Each split expense is shared by `splitRatio` (the non-payer's share, default 0.5).
 *
 * @param {object} params
 * @param {Array}  params.splitExpenses - household split expenses
 * @param {Array}  params.settlements   - { fromUid, toUid, amount }
 * @param {string} params.meUid
 * @param {string} params.partnerUid
 * @returns {number} balance in dollars, rounded to cents
 */
export function computeSettleBalance({ splitExpenses = [], settlements = [], meUid, partnerUid }) {
  let balance = 0

  for (const e of splitExpenses) {
    if (e.type === 'income') continue
    if (e.splitMode !== 'full') continue
    const partnerShare = e.amount * (e.splitRatio ?? 0.5)
    if (e.uid === meUid) balance += partnerShare // partner owes me their share
    else if (e.uid === partnerUid) balance -= partnerShare // I owe the partner my share
  }

  for (const s of settlements) {
    if (s.fromUid === partnerUid && s.toUid === meUid) balance -= s.amount // they paid me back
    else if (s.fromUid === meUid && s.toUid === partnerUid) balance += s.amount // I paid them back
  }

  return roundCents(balance)
}

/**
 * Human-readable description of a settle balance.
 * @param {number} balance - from computeSettleBalance (positive = partner owes you)
 * @param {string} partnerName
 * @returns {{ text: string, amount: number, direction: 'owed'|'owe'|'even' }}
 */
export function describeBalance(balance, partnerName) {
  if (balance > 0.005) return { text: `${partnerName} owes you`, amount: roundCents(balance), direction: 'owed' }
  if (balance < -0.005) return { text: `You owe ${partnerName}`, amount: roundCents(-balance), direction: 'owe' }
  return { text: 'All settled up', amount: 0, direction: 'even' }
}
