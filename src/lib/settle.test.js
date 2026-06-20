import { describe, it, expect } from 'vitest'
import { computeSettleBalance, describeBalance } from './settle.js'

const ME = 'me'
const PARTNER = 'partner'

function fullSplit(uid, amount, splitRatio = 0.5) {
  return { uid, amount, poolType: 'split', splitMode: 'full', splitRatio, type: 'expense' }
}

describe('computeSettleBalance', () => {
  it('returns 0 when there is nothing to settle', () => {
    expect(computeSettleBalance({ splitExpenses: [], settlements: [], meUid: ME, partnerUid: PARTNER })).toBe(0)
  })

  it('counts the partner half of an expense I paid as owed to me', () => {
    const balance = computeSettleBalance({
      splitExpenses: [fullSplit(ME, 100)],
      settlements: [],
      meUid: ME, partnerUid: PARTNER,
    })
    expect(balance).toBe(50)
  })

  it('counts my half of an expense the partner paid as something I owe', () => {
    const balance = computeSettleBalance({
      splitExpenses: [fullSplit(PARTNER, 80)],
      settlements: [],
      meUid: ME, partnerUid: PARTNER,
    })
    expect(balance).toBe(-40)
  })

  it('nets expenses both partners paid', () => {
    const balance = computeSettleBalance({
      splitExpenses: [fullSplit(ME, 100), fullSplit(PARTNER, 40)],
      settlements: [],
      meUid: ME, partnerUid: PARTNER,
    })
    expect(balance).toBe(30) // they owe me 50, I owe them 20 → net 30
  })

  it('ignores legacy split expenses without splitMode (already recorded as halves)', () => {
    const legacy = { uid: ME, amount: 50, poolType: 'split', splitRatio: 0.5, type: 'expense' }
    expect(computeSettleBalance({ splitExpenses: [legacy], settlements: [], meUid: ME, partnerUid: PARTNER })).toBe(0)
  })

  it('ignores income entries', () => {
    const income = { uid: ME, amount: 1000, poolType: 'split', splitMode: 'full', type: 'income' }
    expect(computeSettleBalance({ splitExpenses: [income], settlements: [], meUid: ME, partnerUid: PARTNER })).toBe(0)
  })

  it('a partner→me settlement reduces what they owe me', () => {
    const balance = computeSettleBalance({
      splitExpenses: [fullSplit(ME, 100)],
      settlements: [{ fromUid: PARTNER, toUid: ME, amount: 50 }],
      meUid: ME, partnerUid: PARTNER,
    })
    expect(balance).toBe(0)
  })

  it('a me→partner settlement reduces what I owe them', () => {
    const balance = computeSettleBalance({
      splitExpenses: [fullSplit(PARTNER, 80)],
      settlements: [{ fromUid: ME, toUid: PARTNER, amount: 40 }],
      meUid: ME, partnerUid: PARTNER,
    })
    expect(balance).toBe(0)
  })

  it('honors a non-50/50 split ratio', () => {
    // partner owes 30% of a $100 expense I paid
    const balance = computeSettleBalance({
      splitExpenses: [fullSplit(ME, 100, 0.3)],
      settlements: [],
      meUid: ME, partnerUid: PARTNER,
    })
    expect(balance).toBe(30)
  })

  it('rounds to cents', () => {
    const balance = computeSettleBalance({
      splitExpenses: [fullSplit(ME, 33.33)],
      settlements: [],
      meUid: ME, partnerUid: PARTNER,
    })
    expect(balance).toBe(16.67)
  })
})

describe('describeBalance', () => {
  it('says the partner owes you when positive', () => {
    expect(describeBalance(30, 'Courtney')).toEqual({ text: 'Courtney owes you', amount: 30, direction: 'owed' })
  })

  it('says you owe the partner when negative', () => {
    expect(describeBalance(-30, 'Courtney')).toEqual({ text: 'You owe Courtney', amount: 30, direction: 'owe' })
  })

  it('says all settled when within a cent of zero', () => {
    expect(describeBalance(0, 'Courtney')).toEqual({ text: 'All settled up', amount: 0, direction: 'even' })
    expect(describeBalance(0.004, 'Courtney').direction).toBe('even')
  })
})
