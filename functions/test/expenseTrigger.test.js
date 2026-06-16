const { handlePartnerActivity } = require('../src/handlers/expenseTrigger')

function makeDb({ household, users = {} }) {
  return {
    async getHousehold() { return household },
    async getUser(uid) { return users[uid] ?? null },
  }
}

function recorder() {
  const sent = []
  return { messaging: { send: async (m) => sent.push(m) }, sent }
}

describe('handlePartnerActivity', () => {
  it('notifies the partner (not the logger) on a split expense', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({
      household: { memberUids: ['me', 'partner'] },
      users: { partner: { fcmToken: 'tok-p' } },
    })
    await handlePartnerActivity({ db, messaging, expense: { uid: 'me', type: 'expense', poolType: 'split', amount: 12, categoryId: 'food', householdId: 'h1' } })
    expect(sent).toHaveLength(1)
    expect(sent[0].token).toBe('tok-p')
  })

  it('does not notify on a personal expense', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({ household: { memberUids: ['me', 'partner'] }, users: { partner: { fcmToken: 'tok-p' } } })
    await handlePartnerActivity({ db, messaging, expense: { uid: 'me', type: 'expense', poolType: 'personal', amount: 12, categoryId: 'food', householdId: 'h1' } })
    expect(sent).toHaveLength(0)
  })

  it('respects the partner opting out of partnerActivity', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({
      household: { memberUids: ['me', 'partner'] },
      users: { partner: { fcmToken: 'tok-p', notificationPrefs: { partnerActivity: false } } },
    })
    await handlePartnerActivity({ db, messaging, expense: { uid: 'me', type: 'expense', poolType: 'split', amount: 12, categoryId: 'food', householdId: 'h1' } })
    expect(sent).toHaveLength(0)
  })

  it('does not notify the logger about their own expense', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({
      household: { memberUids: ['me'] },
      users: { me: { fcmToken: 'tok-me' } },
    })
    await handlePartnerActivity({ db, messaging, expense: { uid: 'me', type: 'expense', poolType: 'split', amount: 12, categoryId: 'food', householdId: 'h1' } })
    expect(sent).toHaveLength(0)
  })
})
