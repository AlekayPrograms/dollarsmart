const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const { getPlaidClient } = require('../plaidClient')

const PLAID_CLIENT_ID = 'PLAID_CLIENT_ID'
const PLAID_SECRET = 'PLAID_SECRET'

// List the connected accounts for the signed-in user, masked (no balances or
// full numbers — just name, last digits, type/subtype).
const getAccounts = onCall({ secrets: [PLAID_CLIENT_ID, PLAID_SECRET] }, async (request) => {
  const auth = request.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const fs = admin.firestore()
  const snap = await fs.doc(`plaidItems/${auth.uid}`).get()
  if (!snap.exists) return { accounts: [] }
  const plaid = getPlaidClient()
  const res = await plaid.accountsGet({ access_token: snap.data().accessToken })
  const accounts = (res.data.accounts || []).map((a) => ({
    name: a.name || a.official_name || 'Account',
    mask: a.mask || null,
    type: a.type || null,
    subtype: a.subtype || null,
  }))
  return { accounts }
})

// Disconnect the user's bank: remove the Plaid item, delete the stored token,
// and clear their bank status. (Plaid trial: removing does not free a slot.)
const disconnectBank = onCall({ secrets: [PLAID_CLIENT_ID, PLAID_SECRET] }, async (request) => {
  const auth = request.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const fs = admin.firestore()
  const ref = fs.doc(`plaidItems/${auth.uid}`)
  const snap = await ref.get()
  if (snap.exists) {
    try {
      const plaid = getPlaidClient()
      await plaid.itemRemove({ access_token: snap.data().accessToken })
    } catch (err) {
      // Even if Plaid's removal fails, drop our stored token so the app stops syncing.
      console.error('itemRemove failed (continuing):', err.message || err)
    }
    await ref.delete()
  }
  await fs.doc(`users/${auth.uid}`).set({ bankStatus: null }, { merge: true })
  return { ok: true }
})

module.exports = { getAccounts, disconnectBank }
