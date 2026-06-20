const { makeProcessTransactionsSync } = require('../src/handlers/plaidWebhook')

function fakeDb(initialItems) {
  const writes = {}
  return {
    writes,
    doc(path) {
      return {
        set: async (data, opts) => { writes[path] = { ...(writes[path] || {}), data, opts } },
        create: async (data) => {
          if (Object.prototype.hasOwnProperty.call(writes, path)) throw new Error('ALREADY_EXISTS')
          writes[path] = { data }
        },
        get: async () => ({ exists: Object.prototype.hasOwnProperty.call(writes, path) }),
        delete: async () => { delete writes[path] },
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

function makeSync(db, syncData) {
  const alerts = []
  const fakePlaid = { transactionsSync: async () => ({ data: { has_more: false, next_cursor: 'cursor-2', ...syncData } }) }
  const process = makeProcessTransactionsSync({
    db, getPlaidClient: () => fakePlaid, merchantToCategory: () => 'food',
    sendAlert: async (uid, tx, pendingId) => { alerts.push({ uid, pendingId, categoryId: tx.categoryId }) },
  })
  return { process, alerts }
}

describe('makeProcessTransactionsSync', () => {
  it('writes a posted transaction, sends an alert, and advances the cursor', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const { process, alerts } = makeSync(db, {
      added: [
        { transaction_id: 'tx-1', amount: 24.5, merchant_name: 'Chipotle', date: '2026-06-13', pending: false,
          personal_finance_category: { primary: 'FOOD_AND_DRINK' } },
      ],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-1'].data).toMatchObject({
      uid: 'u1', amount: 24.5, merchantName: 'Chipotle', categoryId: 'food',
      date: '2026-06-13', status: 'pending',
    })
    expect(db.writes['plaidConnections/item-1'].data.cursor).toBe('cursor-2')
    expect(alerts).toEqual([{ uid: 'u1', pendingId: 'tx-1', categoryId: 'food' }])
  })

  it('does NOT enqueue a pending transaction (waits for it to post)', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const { process, alerts } = makeSync(db, {
      added: [{ transaction_id: 'tx-1', amount: 24.5, merchant_name: 'Chipotle', date: '2026-06-13', pending: true }],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-1']).toBeUndefined()
    expect(alerts).toHaveLength(0)
  })

  it('enqueues a transaction when it posts via the modified array', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const { process, alerts } = makeSync(db, {
      modified: [{ transaction_id: 'tx-9', amount: 12, merchant_name: 'Lyft', date: '2026-06-14', pending: false }],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-9'].data).toMatchObject({ uid: 'u1', amount: 12, merchantName: 'Lyft' })
    expect(alerts).toEqual([{ uid: 'u1', pendingId: 'tx-9', categoryId: 'food' }])
  })

  it('enqueues a posted inflow categorized as INCOME as an income entry', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const { process, alerts } = makeSync(db, {
      added: [
        { transaction_id: 'tx-inc', amount: -1500, merchant_name: 'ACME PAYROLL', date: '2026-06-15', pending: false,
          personal_finance_category: { primary: 'INCOME' } },
      ],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-inc'].data).toMatchObject({
      uid: 'u1', amount: 1500, merchantName: 'ACME PAYROLL', entryType: 'income', categoryId: 'other',
    })
    expect(alerts).toEqual([{ uid: 'u1', pendingId: 'tx-inc', categoryId: 'other' }])
  })

  it('treats an incoming Zelle as income even without an income category', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const { process, alerts } = makeSync(db, {
      added: [
        { transaction_id: 'tx-z', amount: -75, merchant_name: '', name: 'Zelle payment from JOHN DOE', date: '2026-06-15', pending: false,
          personal_finance_category: { primary: 'OTHER' } },
      ],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-z'].data).toMatchObject({
      uid: 'u1', amount: 75, entryType: 'income', merchantName: 'Zelle payment from JOHN DOE',
    })
    expect(alerts).toHaveLength(1)
  })

  it('skips credit-card / loan payments to avoid double-counting', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const { process, alerts } = makeSync(db, {
      added: [
        { transaction_id: 'tx-pay', amount: 500, merchant_name: 'BILT', name: 'Payment to Bilt', date: '2026-06-15', pending: false,
          personal_finance_category: { primary: 'LOAN_PAYMENTS' } },
      ],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-pay']).toBeUndefined()
    expect(alerts).toHaveLength(0)
  })

  it('treats an incoming Venmo cashout as income via name match', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const { process, alerts } = makeSync(db, {
      added: [
        { transaction_id: 'tx-v', amount: -67.95, merchant_name: '', name: 'VENMO DES:CASHOUT', date: '2026-06-15', pending: false,
          personal_finance_category: { primary: 'OTHER' } },
      ],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-v'].data).toMatchObject({ uid: 'u1', amount: 67.95, entryType: 'income' })
    expect(alerts).toHaveLength(1)
  })

  it('skips inflows that are not income (e.g. refunds / transfers out)', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const { process, alerts } = makeSync(db, {
      added: [
        { transaction_id: 'tx-ref', amount: -12, merchant_name: 'Amazon refund', date: '2026-06-15', pending: false,
          personal_finance_category: { primary: 'GENERAL_MERCHANDISE' } },
      ],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-ref']).toBeUndefined()
    expect(alerts).toHaveLength(0)
  })

  it('removes a queued entry when its transaction is removed', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    db.writes['pendingTransactions/tx-old'] = { data: { uid: 'u1' } }
    const { process } = makeSync(db, { removed: [{ transaction_id: 'tx-old' }] })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-old']).toBeUndefined()
  })

  it('does not double-prompt a transaction already in the queue', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    db.writes['pendingTransactions/tx-1'] = { data: { uid: 'u1', status: 'pending' } }
    const { process, alerts } = makeSync(db, {
      added: [{ transaction_id: 'tx-1', amount: 24.5, merchant_name: 'Chipotle', date: '2026-06-13', pending: false }],
    })

    await process('item-1')

    expect(alerts).toHaveLength(0)
  })

  function dbWithSettle(ctx) {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    db.getSettleContext = async () => ctx
    return db
  }

  it('auto-settles a partner P2P inflow that pays back what they owe', async () => {
    const db = dbWithSettle({ householdId: 'hh1', partnerUid: 'partner', balance: 50 })
    const { process, alerts } = makeSync(db, {
      added: [{ transaction_id: 'tx-r', amount: -50, merchant_name: '', name: 'Zelle from PARTNER', date: '2026-06-15', pending: false,
        personal_finance_category: { primary: 'OTHER' } }],
    })

    await process('item-1')

    expect(db.writes['settlements/auto_tx-r'].data).toMatchObject({
      householdId: 'hh1', fromUid: 'partner', toUid: 'u1', amount: 50, method: 'zelle', auto: true,
    })
    expect(db.writes['pendingTransactions/tx-r']).toBeUndefined() // not income
    expect(alerts).toHaveLength(0)
  })

  it('settles up to the balance and logs the remainder as income', async () => {
    const db = dbWithSettle({ householdId: 'hh1', partnerUid: 'partner', balance: 50 })
    const { process, alerts } = makeSync(db, {
      added: [{ transaction_id: 'tx-r2', amount: -80, merchant_name: '', name: 'VENMO CASHOUT', date: '2026-06-15', pending: false,
        personal_finance_category: { primary: 'OTHER' } }],
    })

    await process('item-1')

    expect(db.writes['settlements/auto_tx-r2'].data).toMatchObject({ amount: 50, method: 'venmo' })
    expect(db.writes['pendingTransactions/tx-r2'].data).toMatchObject({ uid: 'u1', amount: 30, entryType: 'income' })
    expect(alerts).toHaveLength(1)
  })

  it('suppresses my P2P outflow that reimburses my partner (no double prompt)', async () => {
    const db = dbWithSettle({ householdId: 'hh1', partnerUid: 'partner', balance: -40 })
    const { process, alerts } = makeSync(db, {
      added: [{ transaction_id: 'tx-out', amount: 40, merchant_name: '', name: 'Venmo payment to PARTNER', date: '2026-06-15', pending: false,
        personal_finance_category: { primary: 'GENERAL_SERVICES' } }],
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-out']).toBeUndefined()
    expect(db.writes['settlements/auto_tx-out']).toBeUndefined() // recorded on receiver side only
    expect(alerts).toHaveLength(0)
  })

  it('treats a P2P inflow as income when nothing is owed', async () => {
    const db = dbWithSettle({ householdId: 'hh1', partnerUid: 'partner', balance: 0 })
    const { process, alerts } = makeSync(db, {
      added: [{ transaction_id: 'tx-inc2', amount: -25, merchant_name: '', name: 'Venmo from FRIEND', date: '2026-06-15', pending: false,
        personal_finance_category: { primary: 'OTHER' } }],
    })

    await process('item-1')

    expect(db.writes['settlements/auto_tx-inc2']).toBeUndefined()
    expect(db.writes['pendingTransactions/tx-inc2'].data).toMatchObject({ entryType: 'income', amount: 25 })
    expect(alerts).toHaveLength(1)
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
