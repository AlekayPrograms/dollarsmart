const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getPlaidClient } = require('../plaidClient')

const PLAID_CLIENT_ID = 'PLAID_CLIENT_ID'
const PLAID_SECRET = 'PLAID_SECRET'

function buildLinkTokenRequest(uid, webhookUrl) {
  return {
    user: { client_user_id: uid },
    client_name: 'DollarSmart',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
    webhook: webhookUrl,
  }
}

// Testable core: dependency-injected, no Firebase wrapper.
function makeCreateLinkToken({ getPlaidClient, webhookUrl }) {
  return async function ({ auth }) {
    if (!auth) throw new HttpsError('unauthenticated', 'Sign in required.')
    const plaid = getPlaidClient()
    const res = await plaid.linkTokenCreate(buildLinkTokenRequest(auth.uid, webhookUrl))
    return { linkToken: res.data.link_token }
  }
}

// Firebase wrapper (wired in index.js Task 8). WEBHOOK_URL is set as a param.
const createLinkToken = onCall(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET] },
  (request) => {
    const core = makeCreateLinkToken({
      getPlaidClient,
      webhookUrl: process.env.PLAID_WEBHOOK_URL,
    })
    return core(request)
  },
)

module.exports = { buildLinkTokenRequest, makeCreateLinkToken, createLinkToken }
