import { doc, updateDoc, arrayRemove, setDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'

export async function leaveHousehold(uid, householdId) {
  await updateDoc(doc(db, 'households', householdId), {
    memberUids: arrayRemove(uid),
  })
  await setDoc(doc(db, 'users', uid), { householdId: null }, { merge: true })
}
