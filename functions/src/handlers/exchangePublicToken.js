const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const { getPlaidClient } = require('../plaidClient')

const PLAID_CLIENT_ID = 'PLAID_CLIENT_ID'
const PLAID_SECRET = 'PLAID_SECRET'

// Testable core: dependency-injected db + plaid factory.
function makeExchangePublicToken({ getPlaidClient, db }) {
  return async function ({ auth, data }) {
    if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
    const publicToken = data?.publicToken
    if (!publicToken) throw new HttpsError('invalid-argument', 'publicToken is required.')

    const plaid = getPlaidClient()
    const res = await plaid.itemPublicTokenExchange({ public_token: publicToken })
    const { access_token: accessToken, item_id: itemId } = res.data

    await db.doc(`plaidItems/${auth.uid}`).set({
      accessToken,
      itemId,
      cursor: null,
      status: 'connected',
      updatedAt: new Date().toISOString(),
    })
    await db.doc(`users/${auth.uid}`).set({ bankStatus: 'connected' }, { merge: true })

    return { ok: true }
  }
}

const exchangePublicToken = onCall(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET] },
  (request) => {
    const core = makeExchangePublicToken({ getPlaidClient, db: admin.firestore() })
    return core(request)
  },
)

module.exports = { makeExchangePublicToken, exchangePublicToken }
