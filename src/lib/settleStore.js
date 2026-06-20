import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/client.js'

/**
 * Record a reimbursement between the two household partners. Positive `amount`
 * means `fromUid` paid `toUid` that much, reducing what `fromUid` owes.
 * @param {object} params
 * @param {string} params.householdId
 * @param {string} params.fromUid - who paid
 * @param {string} params.toUid   - who got paid back
 * @param {number} params.amount
 * @param {'manual'|'venmo'|'zelle'|'cashapp'|'paypal'} [params.method]
 * @param {Date}   [params.date]
 * @param {string} [params.note]
 * @returns {Promise<string>} the new doc id
 */
export async function addSettlement({
  householdId, fromUid, toUid, amount, method = 'manual', date = new Date(), note = '',
}) {
  const ref = await addDoc(collection(db, 'settlements'), {
    householdId, fromUid, toUid, amount, method, note,
    date, auto: false,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/** Undo a settlement (e.g. recorded by mistake). */
export async function deleteSettlement(id) {
  await deleteDoc(doc(db, 'settlements', id))
}
