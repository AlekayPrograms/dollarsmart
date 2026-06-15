const { handlePartnerActivity, handleApproachingTarget } = require('../src/handlers/expenseTrigger')

function makeDb({ household, users = {}, monthTotal = 0 }) {
  return {
    async getHousehold() { return household },
    async getUser(uid) { return users[uid] ?? null },
    async getMonthSharedTotal() { return monthTotal },
  }
}

function recorder() {
  const sent = []
  return { messaging: { send: async (m) => sent.push(m) }, sent }
}

describe('handlePartnerActivity', () => {
  it('notifies the partner (not the logger) on a shared expense', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({
      household: { memberUids: ['me', 'partner'] },
      users: { partner: { fcmToken: 'tok-p' } },
    })
    await handlePartnerActivity({ db, messaging, expense: { uid: 'me', type: 'expense', poolType: 'shared', amount: 12, categoryId: 'food', householdId: 'h1' } })
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
    await handlePartnerActivity({ db, messaging, expense: { uid: 'me', type: 'expense', poolType: 'shared', amount: 12, categoryId: 'food', householdId: 'h1' } })
    expect(sent).toHaveLength(0)
  })
})

describe('handleApproachingTarget', () => {
  const household = { memberUids: ['me', 'partner'], sharedTargets: { food: 100 } }
  const users = { me: { fcmToken: 'tok-me' }, partner: { fcmToken: 'tok-p' } }

  it('alerts both members when crossing 80%', async () => {
    const { messaging, sent } = recorder()
    // after = 85, before = 85 - 10 = 75 → crosses 0.8
    const db = makeDb({ household, users, monthTotal: 85 })
    await handleApproachingTarget({ db, messaging, expense: { type: 'expense', poolType: 'shared', amount: 10, householdId: 'h1' } })
    expect(sent).toHaveLength(2)
    expect(sent[0].notification.body).toContain('80%')
  })

  it('does not fire again once already past 80%', async () => {
    const { messaging, sent } = recorder()
    // after = 90, before = 85 → both already past 0.8, not yet at 1.0
    const db = makeDb({ household, users, monthTotal: 90 })
    await handleApproachingTarget({ db, messaging, expense: { type: 'expense', poolType: 'shared', amount: 5, householdId: 'h1' } })
    expect(sent).toHaveLength(0)
  })

  it('fires at 100% crossing', async () => {
    const { messaging, sent } = recorder()
    // after = 105, before = 95 → crosses 1.0
    const db = makeDb({ household, users, monthTotal: 105 })
    await handleApproachingTarget({ db, messaging, expense: { type: 'expense', poolType: 'shared', amount: 10, householdId: 'h1' } })
    expect(sent).toHaveLength(2)
    expect(sent[0].notification.body).toContain('100%')
  })

  it('does nothing when no shared target is set', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({ household: { memberUids: ['me', 'partner'], sharedTargets: {} }, users, monthTotal: 200 })
    await handleApproachingTarget({ db, messaging, expense: { type: 'expense', poolType: 'shared', amount: 10, householdId: 'h1' } })
    expect(sent).toHaveLength(0)
  })

  it('ignores personal expenses', async () => {
    const { messaging, sent } = recorder()
    const db = makeDb({ household, users, monthTotal: 85 })
    await handleApproachingTarget({ db, messaging, expense: { type: 'expense', poolType: 'personal', amount: 10, householdId: 'h1' } })
    expect(sent).toHaveLength(0)
  })
})
