const { computeSettleBalance, p2pMethod } = require('../src/settle')

const ME = 'me'
const PARTNER = 'partner'
const full = (uid, amount, splitRatio = 0.5) => ({ uid, amount, splitMode: 'full', splitRatio, type: 'expense' })

describe('computeSettleBalance (functions)', () => {
  it('is 0 with nothing to settle', () => {
    expect(computeSettleBalance({ splitExpenses: [], settlements: [], meUid: ME, partnerUid: PARTNER })).toBe(0)
  })

  it('counts the partner half of what I paid', () => {
    expect(computeSettleBalance({ splitExpenses: [full(ME, 100)], settlements: [], meUid: ME, partnerUid: PARTNER })).toBe(50)
  })

  it('nets both directions and settlements', () => {
    const balance = computeSettleBalance({
      splitExpenses: [full(ME, 100), full(PARTNER, 40)],
      settlements: [{ fromUid: PARTNER, toUid: ME, amount: 10 }],
      meUid: ME, partnerUid: PARTNER,
    })
    expect(balance).toBe(20) // +50 -20 -10
  })

  it('ignores legacy splits without splitMode', () => {
    expect(computeSettleBalance({ splitExpenses: [{ uid: ME, amount: 50, type: 'expense' }], settlements: [], meUid: ME, partnerUid: PARTNER })).toBe(0)
  })
})

describe('p2pMethod', () => {
  it('detects venmo / zelle / cashapp / paypal', () => {
    expect(p2pMethod({ name: 'VENMO DES:CASHOUT' })).toBe('venmo')
    expect(p2pMethod({ name: 'Zelle payment from JANE' })).toBe('zelle')
    expect(p2pMethod({ merchant_name: 'Cash App' })).toBe('cashapp')
    expect(p2pMethod({ name: 'PAYPAL TRANSFER' })).toBe('paypal')
    expect(p2pMethod({ name: 'random' })).toBe('transfer')
  })
})
