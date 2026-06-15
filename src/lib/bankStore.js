import { doc, setDoc, increment } from 'firebase/firestore'
import { db } from '../firebase/client.js'

// The user's bank balance is a single number on their own user doc. It is set
// manually and then nudged automatically as they log/delete expenses & income,
// so it stays a running estimate of what's in their account.

/** Set the balance to an absolute value (used by the manual "update" control). */
export async function setBankBalance(uid, amount) {
  if (!uid) return
  await setDoc(doc(db, 'users', uid), { bankBalance: amount }, { merge: true })
}

/** Apply a signed delta atomically (used when logging/deleting entries). */
export async function adjustBankBalance(uid, delta) {
  if (!uid || !delta) return
  await setDoc(doc(db, 'users', uid), { bankBalance: increment(delta) }, { merge: true })
}

/**
 * How a logged entry moves the balance: expenses subtract, income adds.
 * @param {'expense'|'income'} type
 * @param {number} amount
 */
export function balanceDelta(type, amount) {
  return type === 'income' ? amount : -amount
}
