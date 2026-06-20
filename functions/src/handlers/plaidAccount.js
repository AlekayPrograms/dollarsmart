const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const { getPlaidClient } = require('../plaidClient')

const PLAID_CLIENT_ID = 'PLAID_CLIENT_ID'
const PLAID_SECRET = 'PLAID_SECRET'

const mapAccount = (a) => ({
  name: a.name || a.official_name || 'Account',
  mask: a.mask || null,
  type: a.type || null,
  subtype: a.subtype || null,
})

// All of a user's connected banks: the new per-bank plaidConnections plus any
// legacy single plaidItems/{uid} doc.
async function listConnections(fs, uid) {
  const conns = []
  const cs = await fs.collection('plaidConnections').where('uid', '==', uid).get()
  cs.forEach((d) => conns.push({ ref: d.ref, itemId: d.id, accessToken: d.data().accessToken, institutionName: d.data().institutionName || 'Bank' }))
  const legacy = await fs.doc(`plaidItems/${uid}`).get()
  if (legacy.exists && legacy.data().accessToken) {
    conns.push({ ref: legacy.ref, itemId: legacy.data().itemId || `legacy:${uid}`, accessToken: legacy.data().accessToken, institutionName: 'Bank', legacy: true })
  }
  return conns
}

// List connected banks, each with its masked accounts.
const getAccounts = onCall({ secrets: [PLAID_CLIENT_ID, PLAID_SECRET] }, async (request) => {
  const auth = request.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const fs = admin.firestore()
  const plaid = getPlaidClient()
  const conns = await listConnections(fs, auth.uid)

  const banks = []
  for (const c of conns) {
    try {
      const r = await plaid.accountsGet({ access_token: c.accessToken })
      banks.push({ itemId: c.itemId, institutionName: c.institutionName, accounts: (r.data.accounts || []).map(mapAccount) })
    } catch (e) {
      banks.push({ itemId: c.itemId, institutionName: c.institutionName, accounts: [], error: true })
    }
  }
  return { banks }
})

// Disconnect ONE bank by itemId (removes the Plaid item + its stored token).
const disconnectBank = onCall({ secrets: [PLAID_CLIENT_ID, PLAID_SECRET] }, async (request) => {
  const auth = request.auth
  if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
  const itemId = request.data && request.data.itemId
  const fs = admin.firestore()
  const plaid = getPlaidClient()

  const conns = await listConnections(fs, auth.uid)
  // If an itemId is given, target it; otherwise (legacy single-bank) take the first.
  const target = itemId ? conns.find((c) => c.itemId === itemId) : conns[0]
  if (target) {
    try {
      await plaid.itemRemove({ access_token: target.accessToken })
    } catch (e) {
      console.error('itemRemove failed (continuing):', e.message || e)
    }
    await target.ref.delete()
  }

  const remaining = (await listConnections(fs, auth.uid)).length
  await fs.doc(`users/${auth.uid}`).set({ bankStatus: remaining > 0 ? 'connected' : null }, { merge: true })
  return { ok: true, remaining }
})

module.exports = { getAccounts, disconnectBank }
