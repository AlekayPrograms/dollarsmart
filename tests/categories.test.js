import { describe, it, expect } from 'vitest'
import { CATEGORIES, getCategory } from '../src/lib/categories.js'

describe('CATEGORIES', () => {
  it('has 10 categories', () => {
    expect(CATEGORIES).toHaveLength(10)
  })

  it('every category has id, label, emoji, color', () => {
    for (const cat of CATEGORIES) {
      expect(cat.id).toBeTruthy()
      expect(cat.label).toBeTruthy()
      expect(cat.emoji).toBeTruthy()
      expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('has unique ids', () => {
    const ids = CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes a pets category for Hachi', () => {
    expect(CATEGORIES.find((c) => c.id === 'pets')).toBeTruthy()
  })
})

describe('getCategory', () => {
  it('returns the category for a known id', () => {
    expect(getCategory('food').label).toBe('Food & Drink')
  })

  it('returns the "other" category for an unknown id', () => {
    expect(getCategory('nonexistent').id).toBe('other')
  })
})
