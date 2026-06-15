import { describe, it, expect } from 'vitest'
import { monthlyTotals, categoryBreakdown } from '../src/lib/trends.js'

describe('monthlyTotals', () => {
  const now = new Date(2026, 5, 15) // 2026-06-15

  it('buckets expenses into the last N months, oldest first', () => {
    const expenses = [
      { type: 'expense', amount: 10, categoryId: 'food', date: new Date(2026, 5, 1) }, // Jun
      { type: 'expense', amount: 5, categoryId: 'food', date: new Date(2026, 5, 20) }, // Jun
      { type: 'expense', amount: 30, categoryId: 'food', date: new Date(2026, 4, 2) }, // May
    ]
    const out = monthlyTotals(expenses, 3, now)
    expect(out.map((b) => b.label)).toEqual(['Apr', 'May', 'Jun'])
    expect(out.find((b) => b.label === 'Jun').total).toBe(15)
    expect(out.find((b) => b.label === 'May').total).toBe(30)
    expect(out.find((b) => b.label === 'Apr').total).toBe(0)
  })

  it('excludes income', () => {
    const expenses = [
      { type: 'income', amount: 1000, categoryId: 'other', date: new Date(2026, 5, 1) },
      { type: 'expense', amount: 40, categoryId: 'food', date: new Date(2026, 5, 1) },
    ]
    const out = monthlyTotals(expenses, 1, now)
    expect(out[0].total).toBe(40)
  })

  it('ignores expenses outside the window', () => {
    const expenses = [
      { type: 'expense', amount: 99, categoryId: 'food', date: new Date(2025, 0, 1) },
    ]
    const out = monthlyTotals(expenses, 3, now)
    expect(out.reduce((a, b) => a + b.total, 0)).toBe(0)
  })

  it('unwraps Firestore Timestamp-like dates', () => {
    const expenses = [
      { type: 'expense', amount: 12, categoryId: 'food', date: { toDate: () => new Date(2026, 5, 10) } },
    ]
    const out = monthlyTotals(expenses, 1, now)
    expect(out[0].total).toBe(12)
  })
})

describe('categoryBreakdown', () => {
  it('sums per category, largest first, with fractional shares', () => {
    const expenses = [
      { type: 'expense', amount: 30, categoryId: 'food' },
      { type: 'expense', amount: 10, categoryId: 'food' },
      { type: 'expense', amount: 60, categoryId: 'transport' },
    ]
    const out = categoryBreakdown(expenses)
    expect(out[0]).toEqual({ categoryId: 'transport', total: 60, pct: 0.6 })
    expect(out[1]).toEqual({ categoryId: 'food', total: 40, pct: 0.4 })
  })

  it('excludes income and zero-spend categories', () => {
    const expenses = [
      { type: 'income', amount: 500, categoryId: 'other' },
      { type: 'expense', amount: 20, categoryId: 'food' },
    ]
    const out = categoryBreakdown(expenses)
    expect(out).toEqual([{ categoryId: 'food', total: 20, pct: 1 }])
  })

  it('returns an empty array with no expenses', () => {
    expect(categoryBreakdown([])).toEqual([])
  })
})
