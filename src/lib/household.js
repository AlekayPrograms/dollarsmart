import {
  doc, setDoc, getDoc, updateDoc, collection, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/client.js'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateCode() {
  let code = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (const byte of array) {
    code += CODE_CHARS[byte % CODE_CHARS.length]
  }
  return code
}

export function isCodeExpired(inviteExpiresAt) {
  if (!inviteExpiresAt) return true
  const expiresMs = inviteExpiresAt.toMillis
    ? inviteExpiresAt.toMillis()
    : new Date(inviteExpiresAt).getTime()
  return Date.now() > expiresMs
}

export async function createHousehold(uid) {
  const householdRef = doc(collection(db, 'households'))
  const code = generateCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await setDoc(householdRef, {
    memberUids: [uid],
    inviteCode: code,
    inviteExpiresAt: expiresAt,
    inviteUsed: false,
    createdAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'users', uid), { householdId: householdRef.id }, { merge: true })

  return { householdId: householdRef.id, inviteCode: code }
}

export async function joinHousehold(uid, code) {
  const lookupRef = doc(db, 'inviteCodes', code)
  const lookupSnap = await getDoc(lookupRef)

  if (!lookupSnap.exists()) throw new Error('INVALID_CODE')

  const { householdId } = lookupSnap.data()
  const householdRef = doc(db, 'households', householdId)
  const householdSnap = await getDoc(householdRef)

  if (!householdSnap.exists()) throw new Error('INVALID_CODE')

  const household = householdSnap.data()

  if (household.inviteUsed) throw new Error('CODE_ALREADY_USED')
  if (isCodeExpired(household.inviteExpiresAt)) throw new Error('CODE_EXPIRED')
  if (household.memberUids.includes(uid)) throw new Error('ALREADY_MEMBER')

  await updateDoc(householdRef, {
    memberUids: [...household.memberUids, uid],
    inviteUsed: true,
  })

  await setDoc(doc(db, 'users', uid), { householdId }, { merge: true })

  return { householdId }
}

export async function createInviteCode(uid, householdId) {
  const code = generateCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await setDoc(doc(db, 'inviteCodes', code), { householdId, createdBy: uid })

  await updateDoc(doc(db, 'households', householdId), {
    inviteCode: code,
    inviteExpiresAt: expiresAt,
    inviteUsed: false,
  })

  return code
}
