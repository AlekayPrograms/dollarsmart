const { generateRecapSummary } = require('../src/handlers/monthlyRecap')

describe('generateRecapSummary', () => {
  it('summarizes spend, top category, and net', () => {
    const expenses = [
      { type: 'expense', amount: 30, categoryId: 'food' },
      { type: 'expense', amount: 10, categoryId: 'food' },
      { type: 'expense', amount: 60, categoryId: 'transport' },
      { type: 'income', amount: 200, categoryId: 'other' },
    ]
    const s = generateRecapSummary({ expenses, monthName: 'May' })
    expect(s).toContain('May:')
    expect(s).toContain('spent $100 on 3 purchases')
    expect(s).toContain('most on Transport ($60)')
    expect(s).toContain('Net +$100') // 200 income - 100 expense
  })

  it('shows a negative net and singular purchase', () => {
    const s = generateRecapSummary({ expenses: [{ type: 'expense', amount: 50, categoryId: 'bills' }], monthName: 'June' })
    expect(s).toContain('on 1 purchase')
    expect(s).toContain('Net −$50')
  })
})
