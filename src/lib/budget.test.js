import { describe, it, expect } from 'vitest'
import { leftToSpend } from './budget.js'

describe('leftToSpend', () => {
  it('returns null when targets is empty', () => {
    expect(leftToSpend({ food: 100 }, {})).toBeNull()
  })

  it('returns null when all targets are 0', () => {
    expect(leftToSpend({ food: 100 }, { food: 0 })).toBeNull()
  })

  it('calculates remaining budget correctly', () => {
    const result = leftToSpend(
      { food: 200, transport: 80 },
      { food: 600, transport: 250 }
    )
    expect(result.left).toBe(570)
    expect(result.total).toBe(850)
    expect(result.spent).toBe(280)
  })

  it('only counts spending in targeted categories', () => {
    const result = leftToSpend(
      { food: 200, groceries: 150 },
      { food: 600 }
    )
    expect(result.spent).toBe(200)
    expect(result.left).toBe(400)
  })

  it('left is negative when over budget', () => {
    const result = leftToSpend({ food: 700 }, { food: 600 })
    expect(result.left).toBe(-100)
  })

  it('pct is clamped to 1 when over budget', () => {
    const result = leftToSpend({ food: 800 }, { food: 600 })
    expect(result.pct).toBe(1)
  })

  it('handles unspent categories (0 spent)', () => {
    const result = leftToSpend({}, { food: 600 })
    expect(result.left).toBe(600)
    expect(result.spent).toBe(0)
    expect(result.pct).toBe(0)
  })
})
