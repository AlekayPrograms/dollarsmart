import {
  collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { adjustBankBalance } from './bankStore.js'
import { balanceDelta } from './expense.js'

/**
 * Add an expense or income entry.
 * @param {object} params
 * @param {string} params.uid - the logging user
 * @param {string} params.householdId
 * @param {number} params.amount
 * @param {string} params.categoryId
 * @param {'expense'|'income'} params.type
 * @param {'personal'|'shared'|'split'} params.poolType
 * @param {string} [params.note]
 * @param {Date} [params.date]
 * @param {number} [params.splitRatio]
 * @returns {Promise<string>} the new doc id
 */
export async function addExpense({
  uid, householdId, amount, categoryId, type, poolType,
  note = '', date = new Date(), splitRatio = 0.5, merchantName = '',
}) {
  const ref = await addDoc(collection(db, 'expenses'), {
    uid,
    householdId,
    amount,
    categoryId,
    type,
    poolType,
    note,
    merchantName,
    date,
    splitRatio: poolType === 'split' ? splitRatio : null,
    reactions: {},
    createdAt: serverTimestamp(),
  })
  // Money left (or entered) the logger's account — keep their balance current.
  await adjustBankBalance(uid, balanceDelta(type, amount))
  return ref.id
}

/**
 * Delete an expense and reverse its effect on the owner's balance.
 * @param {object} expense - the full expense doc ({ id, uid, type, amount })
 */
export async function deleteExpense(expense) {
  await deleteDoc(doc(db, 'expenses', expense.id))
  await adjustBankBalance(expense.uid, -balanceDelta(expense.type, expense.amount))
}

export async function updateExpense(expenseId, updates) {
  await updateDoc(doc(db, 'expenses', expenseId), updates)
}

/**
 * Re-create an expense from a snapshot of its data (used by undo).
 * Returns the new id (the restored doc gets a fresh id).
 */
export async function restoreExpense(data) {
  const { id, createdAt, ...rest } = data
  const ref = await addDoc(collection(db, 'expenses'), {
    ...rest,
    createdAt: serverTimestamp(),
  })
  // Re-apply the balance effect that deleteExpense reversed.
  await adjustBankBalance(rest.uid, balanceDelta(rest.type, rest.amount))
  return ref.id
}
