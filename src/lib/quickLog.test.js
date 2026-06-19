import { describe, it, expect } from 'vitest'
import { getQuickLogChips } from './quickLog.js'

const now = new Date('2026-06-19T12:00:00')
const msPerDay = 86400000
const recent = (daysAgo) => new Date(now.getTime() - daysAgo * msPerDay)

describe('getQuickLogChips', () => {
  it('returns [] for no expenses', () => {
    expect(getQuickLogChips([], now)).toEqual([])
  })

  it('ignores income entries', () => {
    const e = [{ type: 'income', poolType: 'personal', categoryId: 'food', amount: 5, date: recent(1) }]
    expect(getQuickLogChips(e, now)).toEqual([])
  })

  it('ignores split expenses', () => {
    const e = [{ type: 'expense', poolType: 'split', categoryId: 'food', amount: 5, date: recent(1) }]
    expect(getQuickLogChips(e, now)).toEqual([])
  })

  it('ignores expenses older than 90 days', () => {
    const e = [{ type: 'expense', poolType: 'personal', categoryId: 'food', amount: 5, date: recent(91) }]
    expect(getQuickLogChips(e, now)).toEqual([])
  })

  it('returns top 3 sorted by frequency', () => {
    const e = [
      ...Array(3).fill(null).map((_, i) => ({ type: 'expense', poolType: 'personal', categoryId: 'food', amount: 5, date: recent(i + 1) })),
      ...Array(2).fill(null).map((_, i) => ({ type: 'expense', poolType: 'personal', categoryId: 'transport', amount: 40, date: recent(i + 1) })),
      { type: 'expense', poolType: 'personal', categoryId: 'groceries', amount: 60, date: recent(1) },
      { type: 'expense', poolType: 'personal', categoryId: 'health', amount: 25, date: recent(1) },
    ]
    const chips = getQuickLogChips(e, now)
    expect(chips).toHaveLength(3)
    expect(chips[0]).toMatchObject({ categoryId: 'food', amount: 5, count: 3 })
    expect(chips[1]).toMatchObject({ categoryId: 'transport', amount: 40, count: 2 })
  })

  it('groups $4.99 and $5.01 as the same $5 chip', () => {
    const e = [
      { type: 'expense', poolType: 'personal', categoryId: 'food', amount: 4.99, date: recent(1) },
      { type: 'expense', poolType: 'personal', categoryId: 'food', amount: 5.01, date: recent(2) },
    ]
    const chips = getQuickLogChips(e, now)
    expect(chips).toHaveLength(1)
    expect(chips[0].count).toBe(2)
    expect(chips[0].amount).toBe(5)
  })
})
