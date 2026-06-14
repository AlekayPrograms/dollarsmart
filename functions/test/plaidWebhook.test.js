const { makeProcessTransactionsSync } = require('../src/handlers/plaidWebhook')

function fakeDb(initialItems) {
  const writes = {}
  return {
    writes,
    doc(path) {
      return {
        set: async (data, opts) => { writes[path] = { ...(writes[path] || {}), data, opts } },
      }
    },
    // find a plaidItems doc by itemId
    async findItemByItemId(itemId) {
      const entry = Object.entries(initialItems).find(([, v]) => v.itemId === itemId)
      if (!entry) return null
      return { uid: entry[0].split('/')[1], data: entry[1] }
    },
  }
}

describe('makeProcessTransactionsSync', () => {
  it('writes a pending transaction, sends an alert, and advances the cursor', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const alerts = []
    const fakePlaid = {
      transactionsSync: async () => ({
        data: {
          added: [
            { transaction_id: 'tx-1', amount: 24.5, merchant_name: 'Chipotle', date: '2026-06-13',
              personal_finance_category: { primary: 'FOOD_AND_DRINK' } },
          ],
          has_more: false,
          next_cursor: 'cursor-2',
        },
      }),
    }
    const process = makeProcessTransactionsSync({
      db, getPlaidClient: () => fakePlaid, merchantToCategory: () => 'food',
      sendAlert: async (uid, tx, pendingId) => { alerts.push({ uid, pendingId, categoryId: tx.categoryId }) },
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-1'].data).toMatchObject({
      uid: 'u1', amount: 24.5, merchantName: 'Chipotle', categoryId: 'food',
      date: '2026-06-13', status: 'pending',
    })
    expect(db.writes['plaidItems/u1'].data.cursor).toBe('cursor-2')
    expect(alerts).toEqual([{ uid: 'u1', pendingId: 'tx-1', categoryId: 'food' }])
  })

  it('does nothing when the item is unknown', async () => {
    const db = fakeDb({})
    const process = makeProcessTransactionsSync({
      db, getPlaidClient: () => ({}), merchantToCategory: () => 'other', sendAlert: async () => {},
    })
    await process('item-unknown')
    expect(Object.keys(db.writes)).toHaveLength(0)
  })
})
