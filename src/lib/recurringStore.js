import {
  collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/client.js'

/**
 * Create a recurring-expense rule.
 * @param {object} params - uid, householdId, amount, categoryId, type,
 *   poolType, note, merchantName, dayOfMonth, splitRatio, lastPostedMonth
 * @returns {Promise<string>} the new rule id
 */
export async function addRecurring({
  uid, householdId, amount, categoryId, type, poolType,
  note = '', merchantName = '', dayOfMonth, splitRatio = 0.5, lastPostedMonth = null, splitMode = null,
}) {
  const ref = await addDoc(collection(db, 'recurringExpenses'), {
    uid, householdId, amount, categoryId, type, poolType, note, merchantName,
    dayOfMonth,
    splitRatio: poolType === 'split' ? splitRatio : null,
    splitMode: poolType === 'split' ? (splitMode || 'full') : null,
    active: true,
    lastPostedMonth,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteRecurring(id) {
  await deleteDoc(doc(db, 'recurringExpenses', id))
}

export async function setRecurringActive(id, active) {
  await updateDoc(doc(db, 'recurringExpenses', id), { active })
}

/** Record that a rule has posted for a given 'YYYY-MM', so it won't double-post. */
export async function markRecurringPosted(id, monthKey) {
  await updateDoc(doc(db, 'recurringExpenses', id), { lastPostedMonth: monthKey })
}
