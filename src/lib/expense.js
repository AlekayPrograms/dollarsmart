export function normalizeAmount(input) {
  if (typeof input === 'number') return roundCents(input)
  if (typeof input !== 'string') return NaN
  let cleaned = input.replace(/[^0-9.,-]/g, '').trim()
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.')
  } else {
    cleaned = cleaned.replace(/,/g, '')
  }
  const value = parseFloat(cleaned)
  if (Number.isNaN(value)) return NaN
  return roundCents(value)
}

export function validateAmount(amount) {
  return typeof amount === 'number' && !Number.isNaN(amount) && amount > 0
}

export function splitInHalf(amount) {
  return roundCents(amount / 2)
}

function roundCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
