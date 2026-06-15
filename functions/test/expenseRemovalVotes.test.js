const { handleRemovalVotes, reversalDelta, everyVoted } = require('../src/handlers/expenseRemovalVotes')

function fakeDb({ household, users = {} }) {
  const calls = { deleted: [], balance: [] }
  return {
    calls,
    async getHousehold() { return household },
    async getUser(uid) { return users[uid] || null },
    async deleteExpense(id) { calls.deleted.push(id) },
    async adjustBalance(uid, delta) { calls.balance.push({ uid, delta }) },
  }
}

const household = { memberUids: ['u1', 'u2'] }
const users = {
  u1: { fcmToken: 'tok1' },
  u2: { fcmToken: 'tok2' },
}
const sharedExpense = { uid: 'u1', householdId: 'h1', poolType: 'shared', type: 'expense', amount: 40 }

describe('reversalDelta', () => {
  it('gives back a spent amount and takes back received income', () => {
    expect(reversalDelta({ type: 'expense', amount: 40 })).toBe(40)
    expect(reversalDelta({ type: 'income', amount: 40 })).toBe(-40)
  })
})

describe('everyVoted', () => {
  it('is true only when all members are present in the votes', () => {
    expect(everyVoted(['u1', 'u2'], { u1: true, u2: true })).toBe(true)
    expect(everyVoted(['u1', 'u2'], { u1: true })).toBe(false)
    expect(everyVoted([], {})).toBe(false)
  })
})

describe('handleRemovalVotes', () => {
  it('deletes and reverses the owner balance once both have voted', async () => {
    const db = fakeDb({ household, users })
    const sent = []
    await handleRemovalVotes({
      db, messaging: { send: async (m) => sent.push(m) }, expenseId: 'e1',
      before: { ...sharedExpense, removalVotes: { u1: true } },
      after: { ...sharedExpense, removalVotes: { u1: true, u2: true } },
    })
    expect(db.calls.deleted).toEqual(['e1'])
    expect(db.calls.balance).toEqual([{ uid: 'u1', delta: 40 }])
    expect(sent).toHaveLength(2) // both notified it was removed
  })

  it('notifies the member who has not voted when a vote is cast', async () => {
    const db = fakeDb({ household, users })
    const sent = []
    await handleRemovalVotes({
      db, messaging: { send: async (m) => sent.push(m) }, expenseId: 'e1',
      before: { ...sharedExpense, removalVotes: {} },
      after: { ...sharedExpense, removalVotes: { u1: true } },
    })
    expect(db.calls.deleted).toEqual([])
    expect(sent).toHaveLength(1) // only u2 (the pending voter) is nudged
    expect(sent[0].token).toBe('tok2')
  })

  it('ignores non-shared expenses', async () => {
    const db = fakeDb({ household, users })
    const sent = []
    await handleRemovalVotes({
      db, messaging: { send: async (m) => sent.push(m) }, expenseId: 'e1',
      before: { uid: 'u1', householdId: 'h1', poolType: 'personal', type: 'expense', amount: 40, removalVotes: {} },
      after: { uid: 'u1', householdId: 'h1', poolType: 'personal', type: 'expense', amount: 40, removalVotes: { u1: true, u2: true } },
    })
    expect(db.calls.deleted).toEqual([])
    expect(sent).toHaveLength(0)
  })

  it('does not re-delete when it was already unanimous before', async () => {
    const db = fakeDb({ household, users })
    const sent = []
    await handleRemovalVotes({
      db, messaging: { send: async (m) => sent.push(m) }, expenseId: 'e1',
      before: { ...sharedExpense, removalVotes: { u1: true, u2: true } },
      after: { ...sharedExpense, removalVotes: { u1: true, u2: true } },
    })
    expect(db.calls.deleted).toEqual([])
    expect(sent).toHaveLength(0)
  })

  it('does nothing when the expense was deleted (after is null)', async () => {
    const db = fakeDb({ household, users })
    await handleRemovalVotes({
      db, messaging: { send: async () => {} }, expenseId: 'e1',
      before: sharedExpense, after: null,
    })
    expect(db.calls.deleted).toEqual([])
  })
})
