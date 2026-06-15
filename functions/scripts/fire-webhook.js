// One-off Sandbox helper: fires a Plaid webhook so we can test the whole
// pipeline end-to-end (webhook -> transactions/sync -> pendingTransactions ->
// FCM push) without a real bank.
//
// Usage (PowerShell):
//   $env:PLAID_CLIENT_ID="..."; $env:PLAID_SECRET="..."; $env:ACCESS_TOKEN="access-sandbox-..."; node scripts/fire-webhook.js
//
// ACCESS_TOKEN comes from Firestore: plaidItems/{yourUid}.accessToken
// PLAID_CLIENT_ID / PLAID_SECRET are your Sandbox keys from the Plaid dashboard.

const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid')

const clientId = process.env.PLAID_CLIENT_ID
const secret = process.env.PLAID_SECRET
const accessToken = process.env.ACCESS_TOKEN
const code = process.env.WEBHOOK_CODE || 'SYNC_UPDATES_AVAILABLE'

if (!clientId || !secret || !accessToken) {
  console.error('Missing env: set PLAID_CLIENT_ID, PLAID_SECRET, ACCESS_TOKEN')
  process.exit(1)
}

const client = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: { 'PLAID-CLIENT-ID': clientId, 'PLAID-SECRET': secret },
  },
}))

;(async () => {
  try {
    const res = await client.sandboxItemFireWebhook({
      access_token: accessToken,
      webhook_code: code,
    })
    console.log('fired webhook:', code, '->', JSON.stringify(res.data))
  } catch (err) {
    console.error('failed:', err.response ? err.response.data : err.message)
    process.exit(1)
  }
})()
