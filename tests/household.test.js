import { describe, it, expect, vi } from 'vitest'
import { generateCode, isCodeExpired } from '../src/lib/household.js'

vi.mock('../src/firebase/client.js', () => ({
  db: {},
  auth: {},
  app: {},
}))

describe('generateCode', () => {
  it('returns a 6-character string', () => {
    expect(generateCode()).toHaveLength(6)
  })

  it('uses only allowed characters (no O, 0, 1, I)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode()
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    }
  })

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateCode))
    expect(codes.size).toBeGreaterThan(95)
  })
})

describe('isCodeExpired', () => {
  it('returns true for a timestamp in the past', () => {
    const past = new Date(Date.now() - 1000)
    expect(isCodeExpired(past)).toBe(true)
  })

  it('returns false for a timestamp in the future', () => {
    const future = new Date(Date.now() + 60_000)
    expect(isCodeExpired(future)).toBe(false)
  })

  it('returns true for null/undefined', () => {
    expect(isCodeExpired(null)).toBe(true)
    expect(isCodeExpired(undefined)).toBe(true)
  })

  it('handles Firestore Timestamp-like objects with toMillis()', () => {
    const firestoreTs = { toMillis: () => Date.now() - 1000 }
    expect(isCodeExpired(firestoreTs)).toBe(true)
  })
})
