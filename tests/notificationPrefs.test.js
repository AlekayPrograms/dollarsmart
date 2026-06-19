import { describe, it, expect } from 'vitest'
import { DEFAULT_PREFS, applyPrefDefaults } from '../src/lib/notificationPrefs.js'

describe('DEFAULT_PREFS', () => {
  it('has all preference keys with sane defaults', () => {
    expect(DEFAULT_PREFS).toEqual({
      transactionAlert: true,
      dailyNudge: false,
      nudgeTime: '20:00',
      partnerActivity: true,
      approachingTarget: true,
      monthlyRecap: true,
      weeklyInsight: true,
    })
  })
})

describe('applyPrefDefaults', () => {
  it('returns defaults when given undefined', () => {
    expect(applyPrefDefaults(undefined)).toEqual(DEFAULT_PREFS)
  })

  it('returns defaults when given null', () => {
    expect(applyPrefDefaults(null)).toEqual(DEFAULT_PREFS)
  })

  it('overlays stored values on top of defaults', () => {
    const merged = applyPrefDefaults({ transactionAlert: false, nudgeTime: '08:30' })
    expect(merged.transactionAlert).toBe(false)
    expect(merged.nudgeTime).toBe('08:30')
    // untouched keys keep defaults
    expect(merged.partnerActivity).toBe(true)
    expect(merged.dailyNudge).toBe(false)
  })

  it('ignores unknown keys', () => {
    const merged = applyPrefDefaults({ bogus: 123 })
    expect(merged.bogus).toBeUndefined()
    expect(merged).toEqual(DEFAULT_PREFS)
  })
})
