function roundCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Net settle-up balance between two household members, from `meUid`'s view.
 * Positive → the partner owes you; negative → you owe the partner.
 * Mirrors src/lib/settle.js (kept in CommonJS for the Cloud Functions runtime).
 */
function computeSettleBalance({ splitExpenses = [], settlements = [], meUid, partnerUid }) {
  let balance = 0
  for (const e of splitExpenses) {
    if (e.type === 'income') continue
    if (e.splitMode !== 'full') continue
    const partnerShare = e.amount * (e.splitRatio == null ? 0.5 : e.splitRatio)
    if (e.uid === meUid) balance += partnerShare
    else if (e.uid === partnerUid) balance -= partnerShare
  }
  for (const s of settlements) {
    if (s.fromUid === partnerUid && s.toUid === meUid) balance -= s.amount
    else if (s.fromUid === meUid && s.toUid === partnerUid) balance += s.amount
  }
  return roundCents(balance)
}

/** Detect which P2P network a transaction came through, for labeling. */
function p2pMethod(tx) {
  const text = `${tx.merchant_name || ''} ${tx.name || ''}`.toLowerCase()
  if (text.includes('venmo')) return 'venmo'
  if (text.includes('zelle')) return 'zelle'
  if (text.includes('cash app') || text.includes('cashapp')) return 'cashapp'
  if (text.includes('paypal')) return 'paypal'
  return 'transfer'
}

module.exports = { computeSettleBalance, p2pMethod, roundCents }
