import { describe, it, expect } from 'vitest'
import { expensesToCsv } from '../src/lib/csv.js'

describe('expensesToCsv', () => {
  it('produces a header row even with no expenses', () => {
    const csv = expensesToCsv([])
    expect(csv).toBe('date,type,amount,category,note,pool')
  })

  it('formats a single expense row', () => {
    const csv = expensesToCsv([
      {
        date: new Date('2026-06-12T00:00:00Z'),
        type: 'expense', amount: 24.5, categoryId: 'food',
        note: 'lunch', poolType: 'personal',
      },
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('date,type,amount,category,note,pool')
    expect(lines[1]).toBe('2026-06-12,expense,24.50,food,lunch,personal')
  })

  it('escapes commas and quotes in the note field', () => {
    const csv = expensesToCsv([
      {
        date: new Date('2026-06-12T00:00:00Z'),
        type: 'expense', amount: 5, categoryId: 'other',
        note: 'coffee, "the good kind"', poolType: 'shared',
      },
    ])
    const lines = csv.split('\n')
    expect(lines[1]).toBe('2026-06-12,expense,5.00,other,"coffee, ""the good kind""",shared')
  })

  it('handles a Firestore Timestamp-like date with toDate()', () => {
    const csv = expensesToCsv([
      {
        date: { toDate: () => new Date('2026-01-05T00:00:00Z') },
        type: 'income', amount: 1000, categoryId: 'other',
        note: '', poolType: 'personal',
      },
    ])
    expect(csv.split('\n')[1]).toBe('2026-01-05,income,1000.00,other,,personal')
  })
})
