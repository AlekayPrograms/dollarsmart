import { readFileSync } from 'fs'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { setDoc, getDoc, doc } from 'firebase/firestore'

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

  it('forbids reading another user expense (personal privacy)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'expenses', 'bob_exp'), {
        amount: 99,
        categoryId: 'shopping',
        uid: BOB,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'shared',
        date: new Date(),
      })
    })
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(getDoc(doc(alice, 'expenses', 'bob_exp')))
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
