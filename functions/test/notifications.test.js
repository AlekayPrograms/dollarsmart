const { buildTransactionMessage, buildIncomeMessage, makeSendTransactionAlert } = require('../src/notifications')

describe('buildTransactionMessage', () => {
  it('builds an FCM message with body, deep-link data, and token', () => {
    const msg = buildTransactionMessage({
      token: 'tok-1',
      amount: 24.5,
      merchantName: 'Chipotle',
      categoryId: 'food',
      pendingId: 'tx-1',
    })
    expect(msg.token).toBe('tok-1')
    // notification payload (so iOS displays it)
    expect(msg.notification.title).toBe('DollarSmart')
    expect(msg.notification.body).toBe('Looks like you spent $24.50 at Chipotle — log it?')
    // tap routing to the Log screen, pre-filled
    expect(msg.webpush.fcmOptions.link).toContain('/log?')
    expect(msg.webpush.fcmOptions.link).toContain('amount=24.5')
    expect(msg.webpush.fcmOptions.link).toContain('entryType=expense')
    expect(msg.data.entryType).toBe('expense')
    expect(msg.data.pendingId).toBe('tx-1')
  })
})

describe('buildIncomeMessage', () => {
  it('builds an income prompt that deep-links as income', () => {
    const msg = buildIncomeMessage({ token: 'tok-1', amount: 1500, merchantName: 'ACME PAYROLL', pendingId: 'tx-7' })
    expect(msg.notification.body).toBe('Received $1500.00 from ACME PAYROLL — log as income?')
    expect(msg.webpush.fcmOptions.link).toContain('entryType=income')
    expect(msg.data.entryType).toBe('income')
  })

  it('omits the sender clause when none is known', () => {
    const msg = buildIncomeMessage({ token: 'tok-1', amount: 50, pendingId: 'tx-8' })
    expect(msg.notification.body).toBe('Received $50.00 — log as income?')
  })
})

describe('makeSendTransactionAlert', () => {
  function fakeDb(userDocs) {
    return {
      doc(path) {
        return { get: async () => {
          const data = userDocs[path]
          return { exists: data !== undefined, data: () => data }
        } }
      },
    }
  }

  it('sends a push when the user is opted in and has a token', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { fcmToken: 'tok-1', notificationPrefs: { transactionAlert: true } } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 5, merchantName: 'Uber', categoryId: 'transport', transaction_id: 'tx-9' }, 'tx-9')
    expect(sent).toHaveLength(1)
    expect(sent[0].token).toBe('tok-1')
    expect(sent[0].data.pendingId).toBe('tx-9')
  })

  it('does not send when the user opted out of transactionAlert', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { fcmToken: 'tok-1', notificationPrefs: { transactionAlert: false } } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 5, merchantName: 'Uber', categoryId: 'transport' }, 'tx-9')
    expect(sent).toHaveLength(0)
  })

  it('does not send when the user has no token', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { notificationPrefs: { transactionAlert: true } } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 5, merchantName: 'Uber', categoryId: 'transport' }, 'tx-9')
    expect(sent).toHaveLength(0)
  })

  it('defaults transactionAlert to ON when prefs are absent', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { fcmToken: 'tok-1' } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 5, merchantName: 'Uber', categoryId: 'transport' }, 'tx-9')
    expect(sent).toHaveLength(1)
  })

  it('sends an income-styled alert for income entries', async () => {
    const sent = []
    const db = fakeDb({ 'users/u1': { fcmToken: 'tok-1', notificationPrefs: { transactionAlert: true } } })
    const send = makeSendTransactionAlert({ db, messaging: { send: async (m) => { sent.push(m) } } })
    await send('u1', { amount: 1500, merchantName: 'ACME PAYROLL', entryType: 'income' }, 'tx-7')
    expect(sent).toHaveLength(1)
    expect(sent[0].notification.body).toBe('Received $1500.00 from ACME PAYROLL — log as income?')
    expect(sent[0].data.entryType).toBe('income')
  })
})
