const { merchantToCategory } = require('../src/categoryMap')

describe('merchantToCategory', () => {
  it('maps a known food merchant by name keyword', () => {
    expect(merchantToCategory('CHIPOTLE 1234', null)).toBe('food')
    expect(merchantToCategory('Starbucks', null)).toBe('food')
  })

  it('maps grocery merchants', () => {
    expect(merchantToCategory('SAFEWAY #5', null)).toBe('groceries')
    expect(merchantToCategory('Trader Joe\'s', null)).toBe('groceries')
  })

  it('maps ride/transport merchants', () => {
    expect(merchantToCategory('UBER TRIP', null)).toBe('transport')
    expect(merchantToCategory('SHELL OIL', null)).toBe('transport')
  })

  it('falls back to Plaid primary category when no name match', () => {
    expect(merchantToCategory('UNKNOWN VENDOR XYZ', 'TRANSPORTATION')).toBe('transport')
    expect(merchantToCategory('UNKNOWN VENDOR XYZ', 'FOOD_AND_DRINK')).toBe('food')
    expect(merchantToCategory('UNKNOWN VENDOR XYZ', 'GENERAL_MERCHANDISE')).toBe('shopping')
  })

  it('returns "other" when nothing matches', () => {
    expect(merchantToCategory('ZZZ', null)).toBe('other')
    expect(merchantToCategory('', undefined)).toBe('other')
  })

  it('is case-insensitive on the merchant name', () => {
    expect(merchantToCategory('chipotle', null)).toBe('food')
  })
})
