const { handlePartnerActivity, handlePersonalTarget } = require('../src/handlers/expenseTrigger')

function makeDb({ household, users = {}, monthCatTotal = 0 }) {
  return {
    async getHousehold() { return household },
    async getUser(uid) { return users[uid] ?? null },
    async getMonthCategoryTotal() { return monthCatTotal },
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

describe('handlePersonalTarget', () => {
  const expense = { uid: 'me', type: 'expense', poolType: 'personal', amount: 10, categoryId: 'food', householdId: 'h1' }

  it('alerts the logger when crossing 80% of their category target', async () => {
    const { messaging, sent } = recorder()
    // target 100, after = 85, before = 75 → crosses 0.8
    const db = makeDb({ users: { me: { fcmToken: 'tok-me', monthlyTargets: { food: 100 } } }, monthCatTotal: 85 })
    await handlePersonalTarget({ db, messaging, expense })
    expect(sent).toHaveLength(1)
    expect(sent[0].token).toBe('tok-me')
    expect(sent[0].data.body).toContain('80%')
  })

  it('does not alert again once already past 80%', async () => {
    const { messaging, sent } = recorder()
    // after = 90, before = 85 → both past 0.8, not yet 1.0
    const db = makeDb({ users: { me: { fcmToken: 'tok-me', monthlyTargets: { food: 100 } } }, monthCatTotal: 90 })
    await handlePersonalTarget({ db, messaging, expense: { ...expense, amount: 5 } })
    expect(sent).toHaveLength(0)
  })

  it('does nothing when there is no target for the category', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({ users: { me: { fcmToken: 'tok-me', monthlyTargets: { transport: 100 } } }, monthCatTotal: 85 })
    await handlePersonalTarget({ db, messaging, expense })
    expect(sent).toHaveLength(0)
  })

  it('respects opting out of approachingTarget', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({ users: { me: { fcmToken: 'tok-me', monthlyTargets: { food: 100 }, notificationPrefs: { approachingTarget: false } } }, monthCatTotal: 85 })
    await handlePersonalTarget({ db, messaging, expense })
    expect(sent).toHaveLength(0)
  })
})
