import { describe, it, expect } from 'vitest'
import { currentStreak } from '../src/lib/streak.js'

// Helper: build a Date n days before a fixed "today"
const TODAY = new Date('2026-06-12T12:00:00')
function daysAgo(n) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d
}

describe('currentStreak', () => {
  it('returns 0 for no dates', () => {
    expect(currentStreak([], TODAY)).toBe(0)
  })

  it('returns 1 when logged only today', () => {
    expect(currentStreak([daysAgo(0)], TODAY)).toBe(1)
  })

  it('counts consecutive days including today', () => {
    expect(currentStreak([daysAgo(0), daysAgo(1), daysAgo(2)], TODAY)).toBe(3)
  })

  it('still counts a streak that ends yesterday (today not yet logged)', () => {
    expect(currentStreak([daysAgo(1), daysAgo(2)], TODAY)).toBe(2)
  })

  it('breaks the streak when a day is skipped', () => {
    expect(currentStreak([daysAgo(0), daysAgo(1), daysAgo(3)], TODAY)).toBe(2)
  })

  it('returns 0 when the most recent log is older than yesterday', () => {
    expect(currentStreak([daysAgo(3), daysAgo(4)], TODAY)).toBe(0)
  })

  it('dedupes multiple logs on the same day', () => {
    expect(currentStreak([daysAgo(0), daysAgo(0), daysAgo(1)], TODAY)).toBe(2)
  })
})
