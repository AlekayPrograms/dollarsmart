import { describe, it, expect } from 'vitest'
import { upcomingRecurring, forecastBalance } from '../src/lib/forecast.js'

const now = new Date(2026, 5, 10) // 2026-06-10, monthKey 2026-06

const rent = { type: 'expense', amount: 1200, dayOfMonth: 1, active: true, lastPostedMonth: '2026-06' } // already posted
const phone = { type: 'expense', amount: 80, dayOfMonth: 20, active: true, lastPostedMonth: '2026-05' }   // due later
const paycheck = { type: 'income', amount: 2000, dayOfMonth: 15, active: true, lastPostedMonth: null }     // due later
const paused = { type: 'expense', amount: 500, dayOfMonth: 25, active: false, lastPostedMonth: null }      // ignored

describe('upcomingRecurring', () => {
  it('keeps active rules not yet posted this month', () => {
    const out = upcomingRecurring([rent, phone, paycheck, paused], now)
    expect(out).toEqual([phone, paycheck])
  })

  it('excludes everything once posted this month', () => {
    expect(upcomingRecurring([rent], now)).toEqual([])
  })
})

describe('forecastBalance', () => {
  it('adds upcoming income and subtracts upcoming expenses', () => {
    // 500 - 80 (phone) + 2000 (paycheck) = 2420
    expect(forecastBalance(500, [rent, phone, paycheck, paused], now)).toBe(2420)
  })

  it('equals the balance when nothing is upcoming', () => {
    expect(forecastBalance(500, [rent], now)).toBe(500)
  })

  it('returns null when no balance is set', () => {
    expect(forecastBalance(null, [phone], now)).toBeNull()
  })
})
