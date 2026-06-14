const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const jose = require('jose')
const { getPlaidClient } = require('../plaidClient')
const { merchantToCategory } = require('../categoryMap')
const { makeVerifyWebhook, safeDecodeKid } = require('../webhookVerify')
const { makeSendTransactionAlert } = require('../notifications')

const PLAID_CLIENT_ID = 'PLAID_CLIENT_ID'
const PLAID_SECRET = 'PLAID_SECRET'

// --- Firestore helpers over the real Admin SDK, matching the fakeDb shape ---
function adminDbAdapter() {
  const fs = admin.firestore()
  return {
    doc: (path) => fs.doc(path),
    async findItemByItemId(itemId) {
      const snap = await fs.collection('plaidItems').where('itemId', '==', itemId).limit(1).get()
      if (snap.empty) return null
      const d = snap.docs[0]
      return { uid: d.id, data: d.data() }
    },
  }
}

// Testable core: pull new transactions for an item, write pending docs, and
// fire a per-transaction push alert.
function makeProcessTransactionsSync({ db, getPlaidClient, merchantToCategory, sendAlert }) {
  return async function (itemId) {
    const item = await db.findItemByItemId(itemId)
    if (!item) return
    const plaid = getPlaidClient()

    let cursor = item.data.cursor || undefined
    let hasMore = true
    while (hasMore) {
      const res = await plaid.transactionsSync({ access_token: item.data.accessToken, cursor })
      const { added, has_more: more, next_cursor: next } = res.data
      for (const tx of added) {
        // Plaid uses positive amounts for outflow (spending) and negative for
        // inflow (refunds, payments received). Only prompt to log spending.
        if (!(tx.amount > 0)) continue
        const categoryId = merchantToCategory(
          tx.merchant_name || tx.name,
          tx.personal_finance_category && tx.personal_finance_category.primary,
        )
        await db.doc(`pendingTransactions/${tx.transaction_id}`).set({
          uid: item.uid,
          amount: tx.amount,
          merchantName: tx.merchant_name || tx.name || 'Unknown',
          categoryId,
          date: tx.date,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        await sendAlert(item.uid, { ...tx, categoryId }, tx.transaction_id)
      }
      cursor = next
      hasMore = more
      // Persist the cursor after each page so a mid-pagination failure resumes
      // forward on Plaid's retry instead of re-processing earlier pages.
      await db.doc(`plaidItems/${item.uid}`).set({ cursor: cursor || null }, { merge: true })
    }
  }
}

// Mark a user as needing re-auth (ITEM_LOGIN_REQUIRED etc.)
async function markReauthRequired(db, itemId) {
  const item = await db.findItemByItemId(itemId)
  if (!item) return
  await db.doc(`plaidItems/${item.uid}`).set({ status: 'reauth_required' }, { merge: true })
  await db.doc(`users/${item.uid}`).set({ bankStatus: 'reauth_required' }, { merge: true })
}

const plaidWebhook = onRequest(
  { secrets: [PLAID_CLIENT_ID, PLAID_SECRET] },
  async (req, res) => {
    const header = req.get('Plaid-Verification')

    // We must hash the EXACT bytes Plaid signed. Re-serializing req.body would
    // produce a different string and never match the signature, so if the raw
    // body is unavailable we fail closed rather than guess.
    if (!req.rawBody) { res.status(401).send('missing raw body'); return }
    const rawBody = req.rawBody.toString('utf8')

    const verify = makeVerifyWebhook({
      getKey: async () => {
        const kid = safeDecodeKid(header)
        const plaid = getPlaidClient()
        const keyRes = await plaid.webhookVerificationKeyGet({ key_id: kid })
        const key = keyRes.data.key
        if (key.expired_at) throw new Error('verification key expired')
        return key
      },
      verifyJwt: async (token, jwk) => {
        const key = await jose.importJWK(jwk, 'ES256')
        return jose.jwtVerify(token, key, { algorithms: ['ES256'], maxTokenAge: '5 min' })
      },
    })

    const ok = await verify({ header, rawBody })
    if (!ok) { res.status(401).send('invalid signature'); return }

    // Route off the verified bytes, not the separately-parsed req.body.
    let body
    try { body = JSON.parse(rawBody) } catch { res.status(400).send('bad body'); return }
    const { webhook_type: type, webhook_code: code, item_id: itemId } = body
    const db = adminDbAdapter()
    try {
      if (type === 'TRANSACTIONS' && (code === 'SYNC_UPDATES_AVAILABLE' || code === 'DEFAULT_UPDATE' || code === 'INITIAL_UPDATE' || code === 'HISTORICAL_UPDATE')) {
        const sendAlert = makeSendTransactionAlert({ db, messaging: admin.messaging() })
        const process = makeProcessTransactionsSync({ db, getPlaidClient, merchantToCategory, sendAlert })
        await process(itemId)
      } else if (type === 'ITEM' && (code === 'ERROR' || code === 'PENDING_EXPIRATION' || code === 'USER_PERMISSION_REVOKED')) {
        await markReauthRequired(db, itemId)
      }
      res.status(200).send('ok')
    } catch (err) {
      console.error('webhook processing failed', err)
      res.status(500).send('error')
    }
  },
)

module.exports = { makeProcessTransactionsSync, markReauthRequired, plaidWebhook }
