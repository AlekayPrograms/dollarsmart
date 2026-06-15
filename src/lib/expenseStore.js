import {
  collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/client.js'

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
  return ref.id
}

export async function deleteExpense(expenseId) {
  await deleteDoc(doc(db, 'expenses', expenseId))
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
  return ref.id
}
