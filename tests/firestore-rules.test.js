import { readFileSync } from 'fs'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { setDoc, getDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore'

let testEnv

const ALICE = 'alice_uid'
const BOB = 'bob_uid'
const HOUSEHOLD = 'house_1'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-dollarsmart',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Seed a household with Alice and Bob as members, bypassing rules.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'households', HOUSEHOLD), {
      memberUids: [ALICE, BOB],
      inviteCode: 'ABC123',
      inviteUsed: true,
    })
  })
})

describe('users collection', () => {
  it('lets a user write their own profile', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(
      setDoc(doc(alice, 'users', ALICE), { displayName: 'Alice' })
    )
  })

  it('forbids writing another user profile', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(
      setDoc(doc(alice, 'users', BOB), { displayName: 'Hacker' })
    )
  })
})

describe('households collection', () => {
  it('lets a member read their household', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(getDoc(doc(alice, 'households', HOUSEHOLD)))
  })

  it('forbids a non-member from reading a household', async () => {
    const stranger = testEnv.authenticatedContext('stranger_uid').firestore()
    await assertFails(getDoc(doc(stranger, 'households', HOUSEHOLD)))
  })
})

describe('households — joining via invite', () => {
  const CAROL = 'carol_uid'
  const DAVE = 'dave_uid'
  const JOINABLE = 'joinable_house'

  beforeEach(async () => {
    // A household with one member and an unused invite, ready to be joined.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households', JOINABLE), {
        memberUids: [ALICE],
        inviteCode: 'JOIN12',
        inviteUsed: false,
      })
    })
  })

  it('lets a prospective joiner read a household with an unused invite', async () => {
    const carol = testEnv.authenticatedContext(CAROL).firestore()
    await assertSucceeds(getDoc(doc(carol, 'households', JOINABLE)))
  })

  it('lets a non-member join by adding only themselves and marking it used', async () => {
    const carol = testEnv.authenticatedContext(CAROL).firestore()
    await assertSucceeds(
      updateDoc(doc(carol, 'households', JOINABLE), {
        memberUids: [ALICE, CAROL],
        inviteUsed: true,
      })
    )
  })

  it('forbids a joiner from adding someone other than themselves', async () => {
    const carol = testEnv.authenticatedContext(CAROL).firestore()
    await assertFails(
      updateDoc(doc(carol, 'households', JOINABLE), {
        memberUids: [ALICE, DAVE],
        inviteUsed: true,
      })
    )
  })

  it('forbids joining once the invite has been used', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'households', JOINABLE), {
        memberUids: [ALICE], inviteCode: 'JOIN12', inviteUsed: true,
      })
    })
    const carol = testEnv.authenticatedContext(CAROL).firestore()
    await assertFails(
      updateDoc(doc(carol, 'households', JOINABLE), {
        memberUids: [ALICE, CAROL],
        inviteUsed: true,
      })
    )
  })
})

describe('expenses collection', () => {
  it('lets a household member create their own expense', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(
      setDoc(doc(alice, 'expenses', 'exp1'), {
        amount: 24.5,
        categoryId: 'food',
        uid: ALICE,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'personal',
        date: new Date(),
      })
    )
  })

  it('forbids creating an expense under another user uid', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(
      setDoc(doc(alice, 'expenses', 'exp2'), {
        amount: 10,
        categoryId: 'food',
        uid: BOB,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'personal',
        date: new Date(),
      })
    )
  })

  it("forbids reading another user's PERSONAL expense (privacy)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'expenses', 'bob_personal'), {
        amount: 99,
        categoryId: 'shopping',
        uid: BOB,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'personal',
        date: new Date(),
      })
    })
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(getDoc(doc(alice, 'expenses', 'bob_personal')))
  })

  it("lets a household member read a partner's SHARED expense", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'expenses', 'bob_shared'), {
        amount: 40, categoryId: 'groceries', uid: BOB, householdId: HOUSEHOLD,
        type: 'expense', poolType: 'shared', date: new Date(),
      })
    })
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(getDoc(doc(alice, 'expenses', 'bob_shared')))
  })

  it("forbids a non-member from reading a household's shared expense", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'expenses', 'bob_shared2'), {
        amount: 40, categoryId: 'groceries', uid: BOB, householdId: HOUSEHOLD,
        type: 'expense', poolType: 'shared', date: new Date(),
      })
    })
    const stranger = testEnv.authenticatedContext('stranger_uid').firestore()
    await assertFails(getDoc(doc(stranger, 'expenses', 'bob_shared2')))
  })

  it('forbids an unauthenticated user from creating an expense', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(doc(anon, 'expenses', 'exp3'), {
        amount: 5,
        categoryId: 'food',
        uid: ALICE,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'personal',
        date: new Date(),
      })
    )
  })
})

describe('plaidItems (server-only)', () => {
  it('denies any client read', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(getDoc(doc(alice, 'plaidItems', ALICE)))
  })

  it('denies any client write', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(setDoc(doc(alice, 'plaidItems', ALICE), { accessToken: 'x' }))
  })
})

describe('pendingTransactions collection', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'pendingTransactions', 'tx1'), {
        uid: ALICE,
        amount: 10,
        merchantName: 'Chipotle',
        categoryId: 'food',
        date: '2026-06-13',
        status: 'pending',
      })
    })
  })

  it('lets the owner read their pending transaction', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(getDoc(doc(alice, 'pendingTransactions', 'tx1')))
  })

  it('forbids another user from reading it', async () => {
    const bob = testEnv.authenticatedContext(BOB).firestore()
    await assertFails(getDoc(doc(bob, 'pendingTransactions', 'tx1')))
  })

  it('lets the owner delete (dismiss) it', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(deleteDoc(doc(alice, 'pendingTransactions', 'tx1')))
  })

  it('forbids any client from creating one', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(
      setDoc(doc(alice, 'pendingTransactions', 'tx2'), {
        uid: ALICE,
        amount: 5,
        status: 'pending',
      })
    )
  })
})
