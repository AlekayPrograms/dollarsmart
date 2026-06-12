import { describe, it, expect } from 'vitest'
import { normalizeAmount, validateAmount, splitInHalf } from '../src/lib/expense.js'

describe('normalizeAmount', () => {
  it('parses a plain number string', () => {
    expect(normalizeAmount('24.50')).toBe(24.5)
  })

  it('strips currency symbols and spaces', () => {
    expect(normalizeAmount('$ 24.50')).toBe(24.5)
  })

  it('handles comma as decimal separator', () => {
    expect(normalizeAmount('24,50')).toBe(24.5)
  })

  it('returns NaN for non-numeric input', () => {
    expect(normalizeAmount('abc')).toBeNaN()
  })

  it('rounds to 2 decimal places', () => {
    expect(normalizeAmount('24.999')).toBe(25)
    expect(normalizeAmount('24.005')).toBe(24.01)
  })
})

describe('validateAmount', () => {
  it('accepts a positive number', () => {
    expect(validateAmount(24.5)).toBe(true)
  })

  it('rejects zero', () => {
    expect(validateAmount(0)).toBe(false)
  })

  it('rejects negative numbers', () => {
    expect(validateAmount(-5)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(validateAmount(NaN)).toBe(false)
  })
})

describe('splitInHalf', () => {
  it('halves an even amount', () => {
    expect(splitInHalf(24.5)).toBe(12.25)
  })

  it('rounds the half to 2 decimals', () => {
    expect(splitInHalf(24.51)).toBe(12.26)
  })
})
