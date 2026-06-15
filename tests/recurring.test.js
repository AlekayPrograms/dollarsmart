import { describe, it, expect } from 'vitest'
import { monthKey, lastDayOfMonth, effectiveDay, isRuleDue } from '../src/lib/recurring.js'

describe('monthKey', () => {
  it('formats a Date as YYYY-MM', () => {
    expect(monthKey(new Date(2026, 5, 15))).toBe('2026-06')
    expect(monthKey(new Date(2026, 0, 1))).toBe('2026-01')
  })
})

describe('lastDayOfMonth', () => {
  it('handles 30/31-day months and February', () => {
    expect(lastDayOfMonth(2026, 0)).toBe(31)  // Jan
    expect(lastDayOfMonth(2026, 3)).toBe(30)  // Apr
    expect(lastDayOfMonth(2026, 1)).toBe(28)  // Feb (non-leap)
    expect(lastDayOfMonth(2024, 1)).toBe(29)  // Feb (leap)
  })
})

describe('effectiveDay', () => {
  it('clamps the day to the last day of short months', () => {
    expect(effectiveDay(15, 2026, 5)).toBe(15)
    expect(effectiveDay(31, 2026, 1)).toBe(28) // Feb
    expect(effectiveDay(31, 2024, 1)).toBe(29) // leap Feb
  })
})

describe('isRuleDue', () => {
  const base = { dayOfMonth: 15, active: true, lastPostedMonth: null }

  it('is due on or after its day when not yet posted this month', () => {
    expect(isRuleDue(base, new Date(2026, 5, 15))).toBe(true)
    expect(isRuleDue(base, new Date(2026, 5, 20))).toBe(true)
  })

  it('is not due before its day', () => {
    expect(isRuleDue(base, new Date(2026, 5, 14))).toBe(false)
  })

  it('is not due if already posted this month', () => {
    expect(isRuleDue({ ...base, lastPostedMonth: '2026-06' }, new Date(2026, 5, 20))).toBe(false)
  })

  it('becomes due again the next month', () => {
    expect(isRuleDue({ ...base, lastPostedMonth: '2026-06' }, new Date(2026, 6, 15))).toBe(true)
  })

  it('is not due when paused', () => {
    expect(isRuleDue({ ...base, active: false }, new Date(2026, 5, 20))).toBe(false)
  })

  it('clamps high days into February (due on the 28th)', () => {
    const rule = { dayOfMonth: 31, active: true, lastPostedMonth: null }
    expect(isRuleDue(rule, new Date(2026, 1, 28))).toBe(true)
    expect(isRuleDue(rule, new Date(2026, 1, 27))).toBe(false)
  })
})
