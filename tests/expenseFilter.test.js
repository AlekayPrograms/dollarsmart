import { describe, it, expect } from 'vitest'
import { toLocalDateStr, matchesPeriod, availableYears } from '../src/lib/expenseFilter.js'

describe('toLocalDateStr', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    expect(toLocalDateStr(new Date(2026, 5, 9))).toBe('2026-06-09')
  })

  it('unwraps a Firestore Timestamp-like object', () => {
    const ts = { toDate: () => new Date(2025, 11, 25) }
    expect(toLocalDateStr(ts)).toBe('2025-12-25')
  })

  it('returns empty string for invalid input', () => {
    expect(toLocalDateStr('not-a-date')).toBe('')
  })
})

describe('matchesPeriod', () => {
  const date = new Date(2026, 5, 15) // 2026-06-15

  it('matches everything in all mode', () => {
    expect(matchesPeriod(date, { mode: 'all', value: '' })).toBe(true)
  })

  it('matches by year', () => {
    expect(matchesPeriod(date, { mode: 'year', value: '2026' })).toBe(true)
    expect(matchesPeriod(date, { mode: 'year', value: '2025' })).toBe(false)
  })

  it('matches by month', () => {
    expect(matchesPeriod(date, { mode: 'month', value: '2026-06' })).toBe(true)
    expect(matchesPeriod(date, { mode: 'month', value: '2026-05' })).toBe(false)
  })

  it('matches by day', () => {
    expect(matchesPeriod(date, { mode: 'day', value: '2026-06-15' })).toBe(true)
    expect(matchesPeriod(date, { mode: 'day', value: '2026-06-14' })).toBe(false)
  })

  it('matches everything when value is empty regardless of mode', () => {
    expect(matchesPeriod(date, { mode: 'month', value: '' })).toBe(true)
  })
})

describe('availableYears', () => {
  it('returns distinct years newest-first including current year', () => {
    const dates = [new Date(2024, 0, 1), new Date(2026, 0, 1), new Date(2024, 6, 1)]
    expect(availableYears(dates, 2026)).toEqual(['2026', '2024'])
  })

  it('always includes the current year even with no data', () => {
    expect(availableYears([], 2026)).toEqual(['2026'])
  })
})
