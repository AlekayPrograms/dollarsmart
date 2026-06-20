import {
  collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, deleteField,
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
 * @param {'personal'|'split'} params.poolType
 * @param {string} [params.note]
 * @param {Date} [params.date]
 * @param {number} [params.splitRatio]
 * @returns {Promise<string>} the new doc id
 */
export async function addExpense({
  uid, householdId, amount, categoryId, type, poolType,
  note = '', date = new Date(), splitRatio = 0.5, merchantName = '', splitMode = null,
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
    splitMode: poolType === 'split' ? (splitMode || 'full') : null,
    reactions: {},
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/**
 * Delete an expense. (Balance is calculated from remaining entries, so there's
 * no stored balance to adjust.)
 * @param {object} expense - the expense doc ({ id, ... })
 */
export async function deleteExpense(expense) {
  await deleteDoc(doc(db, 'expenses', expense.id))
}

export async function updateExpense(expenseId, updates) {
  await updateDoc(doc(db, 'expenses', expenseId), updates)
}

/**
 * Cast a vote to remove a shared/split expense. When every household member
 * has voted, a Cloud Function deletes it and reverses the owner's balance.
 */
export async function voteToRemove(expenseId, uid) {
  await updateDoc(doc(db, 'expenses', expenseId), { [`removalVotes.${uid}`]: true })
}

/** Withdraw a previously-cast removal vote. */
export async function cancelRemovalVote(expenseId, uid) {
  await updateDoc(doc(db, 'expenses', expenseId), { [`removalVotes.${uid}`]: deleteField() })
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
