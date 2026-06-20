import { describe, it, expect } from 'vitest'
import { getQuickLogChips, chipKey } from './quickLog.js'

const now = new Date('2026-06-19T12:00:00')
const msPerDay = 86400000
const recent = (daysAgo) => new Date(now.getTime() - daysAgo * msPerDay)

const expense = (over = {}) => ({
  type: 'expense', poolType: 'personal', categoryId: 'food', amount: 5,
  merchantName: 'Starbucks', date: recent(1), ...over,
})

describe('getQuickLogChips', () => {
  it('returns [] for no expenses', () => {
    expect(getQuickLogChips([], now)).toEqual([])
  })

  it('ignores income entries', () => {
    expect(getQuickLogChips([expense({ type: 'income' }), expense({ date: recent(2) })], now)).toEqual([])
  })

  it('includes split expenses (so recurring splits generate chips)', () => {
    const chips = getQuickLogChips([expense({ poolType: 'split' }), expense({ poolType: 'split', date: recent(2) })], now)
    expect(chips).toHaveLength(1)
  })

  it('ignores expenses without a merchant/brand', () => {
    const e = [expense({ merchantName: '' }), expense({ merchantName: '   ', date: recent(2) })]
    expect(getQuickLogChips(e, now)).toEqual([])
  })

  it('ignores expenses older than 90 days', () => {
    expect(getQuickLogChips([expense({ date: recent(91) }), expense({ date: recent(95) })], now)).toEqual([])
  })

  it('requires at least 2 occurrences to become a chip', () => {
    expect(getQuickLogChips([expense()], now)).toEqual([])
  })

  it('labels a chip with the brand and keeps category for the icon', () => {
    const chips = getQuickLogChips([expense({ date: recent(1) }), expense({ date: recent(3) })], now)
    expect(chips).toHaveLength(1)
    expect(chips[0]).toMatchObject({ merchantName: 'Starbucks', categoryId: 'food', amount: 5, count: 2 })
  })

  it('ranks brands by frequency and returns the top `limit`', () => {
    const e = [
      ...Array(3).fill(null).map((_, i) => expense({ merchantName: 'Starbucks', amount: 5, date: recent(i + 1) })),
      ...Array(2).fill(null).map((_, i) => expense({ merchantName: 'Uber', categoryId: 'transport', amount: 20, date: recent(i + 1) })),
    ]
    const chips = getQuickLogChips(e, now, 1)
    expect(chips).toHaveLength(1)
    expect(chips[0]).toMatchObject({ merchantName: 'Starbucks', amount: 5, count: 3 })
  })

  it('groups $4.99 and $5.01 at the same brand as one chip, keeping exact cents', () => {
    const e = [expense({ amount: 4.99, date: recent(1) }), expense({ amount: 5.01, date: recent(2) })]
    const chips = getQuickLogChips(e, now)
    expect(chips).toHaveLength(1)
    // Grouped by rounded amount, but the chip keeps the most recent exact amount.
    expect(chips[0]).toMatchObject({ amount: 4.99, count: 2 })
  })

  it('groups brand names case-insensitively', () => {
    const e = [expense({ merchantName: 'STARBUCKS', date: recent(1) }), expense({ merchantName: 'starbucks', date: recent(2) })]
    const chips = getQuickLogChips(e, now)
    expect(chips).toHaveLength(1)
    expect(chips[0].count).toBe(2)
  })

  it('removes a chip that was already logged today', () => {
    const e = [
      expense({ date: recent(1) }),
      expense({ date: recent(2) }),
      expense({ date: now }), // logged today -> hide for today
    ]
    expect(getQuickLogChips(e, now)).toEqual([])
  })

  it('removes chips whose key is in the dismissed set', () => {
    const e = [expense({ date: recent(1) }), expense({ date: recent(2) })]
    const dismissed = new Set([chipKey('Starbucks', 5)])
    expect(getQuickLogChips(e, now, 3, dismissed)).toEqual([])
  })
})

describe('chipKey', () => {
  it('is brand + amount, case-insensitive and trimmed', () => {
    expect(chipKey('  Starbucks ', 5)).toBe('starbucks:5')
    expect(chipKey('STARBUCKS', 5)).toBe('starbucks:5')
  })
})
