import { describe, it, expect } from 'vitest'
import { predictCategory } from './categoryPredictor.js'

const now = new Date('2026-06-19T12:00:00')
const recent = (daysAgo) => new Date(now.getTime() - daysAgo * 86400000)

describe('predictCategory', () => {
  it('returns null for empty/null merchantName', () => {
    expect(predictCategory([], '', now)).toBeNull()
    expect(predictCategory([], null, now)).toBeNull()
    expect(predictCategory([], '   ', now)).toBeNull()
  })

  it('returns null when no matching history', () => {
    const e = [{ merchantName: 'Walmart', categoryId: 'groceries', date: recent(1) }]
    expect(predictCategory(e, 'Chipotle', now)).toBeNull()
  })

  it('returns null when fewer than 2 matches', () => {
    const e = [{ merchantName: 'Chipotle', categoryId: 'food', date: recent(1) }]
    expect(predictCategory(e, 'Chipotle', now)).toBeNull()
  })

  it('returns most common categoryId', () => {
    const e = [
      { merchantName: 'Chipotle', categoryId: 'food', date: recent(1) },
      { merchantName: 'Chipotle', categoryId: 'food', date: recent(2) },
      { merchantName: 'Chipotle', categoryId: 'entertainment', date: recent(3) },
    ]
    expect(predictCategory(e, 'Chipotle', now)).toBe('food')
  })

  it('ignores expenses older than 60 days', () => {
    const e = [
      { merchantName: 'Chipotle', categoryId: 'food', date: recent(61) },
      { merchantName: 'Chipotle', categoryId: 'food', date: recent(62) },
    ]
    expect(predictCategory(e, 'Chipotle', now)).toBeNull()
  })

  it('is case-insensitive', () => {
    const e = [
      { merchantName: 'chipotle', categoryId: 'food', date: recent(1) },
      { merchantName: 'CHIPOTLE', categoryId: 'food', date: recent(2) },
    ]
    expect(predictCategory(e, 'Chipotle', now)).toBe('food')
  })

  it('ignores expenses with no merchantName', () => {
    const e = [
      { merchantName: null, categoryId: 'food', date: recent(1) },
      { merchantName: '', categoryId: 'food', date: recent(2) },
    ]
    expect(predictCategory(e, 'Chipotle', now)).toBeNull()
  })
})
