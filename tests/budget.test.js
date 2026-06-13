import { describe, it, expect } from 'vitest'
import { sumByCategory, sumByPool, budgetProgress } from '../src/lib/budget.js'

const expenses = [
  { amount: 10, categoryId: 'food', poolType: 'personal', type: 'expense' },
  { amount: 5, categoryId: 'food', poolType: 'shared', type: 'expense' },
  { amount: 20, categoryId: 'transport', poolType: 'personal', type: 'expense' },
  { amount: 100, categoryId: 'food', poolType: 'personal', type: 'income' },
]

describe('sumByCategory', () => {
  it('sums expense amounts per category, ignoring income', () => {
    const result = sumByCategory(expenses)
    expect(result.food).toBe(15)
    expect(result.transport).toBe(20)
  })

  it('returns an empty object for no expenses', () => {
    expect(sumByCategory([])).toEqual({})
  })
})

describe('sumByPool', () => {
  it('sums expense amounts per pool, ignoring income', () => {
    const result = sumByPool(expenses)
    expect(result.personal).toBe(30)
    expect(result.shared).toBe(5)
  })
})

describe('budgetProgress', () => {
  it('returns ratio and status "ok" below 80%', () => {
    const p = budgetProgress(50, 100)
    expect(p.ratio).toBe(0.5)
    expect(p.status).toBe('ok')
  })

  it('returns status "warn" at or above 80%', () => {
    expect(budgetProgress(80, 100).status).toBe('warn')
  })

  it('returns status "over" above 100%', () => {
    expect(budgetProgress(120, 100).status).toBe('over')
  })

  it('handles a zero or missing target as no-target', () => {
    expect(budgetProgress(50, 0).status).toBe('none')
    expect(budgetProgress(50, undefined).status).toBe('none')
  })
})
