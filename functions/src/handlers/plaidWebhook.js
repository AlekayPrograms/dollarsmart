const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const jose = require('jose')
const { getPlaidClient } = require('../plaidClient')
const { merchantToCategory } = require('../categoryMap')
const { makeVerifyWebhook, safeDecodeKid } = require('../webhookVerify')

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

// Testable core: pull new transactions for an item and write pending docs.
function makeProcessTransactionsSync({ db, getPlaidClient, merchantToCategory }) {
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
        const categoryId = merchantToCategory(
          tx.merchant_name || tx.name,
          tx.personal_finance_category && tx.personal_finance_category.primary,
        )
        await db.doc(`pendingTransactions/${tx.transaction_id}`).set({
          uid: item.uid,
          amount: Math.abs(tx.amount),
          merchantName: tx.merchant_name || tx.name || 'Unknown',
          categoryId,
          date: tx.date,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
      }
      cursor = next
      hasMore = more
    }
    await db.doc(`plaidItems/${item.uid}`).set({ cursor: cursor || null }, { merge: true })
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
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body)
    const header = req.get('Plaid-Verification')

    const verify = makeVerifyWebhook({
      getKey: async () => {
        const kid = safeDecodeKid(header)
        const plaid = getPlaidClient()
        const keyRes = await plaid.webhookVerificationKeyGet({ key_id: kid })
        return keyRes.data.key
      },
      verifyJwt: async (token, jwk) => {
        const key = await jose.importJWK(jwk, 'ES256')
        return jose.jwtVerify(token, key, { algorithms: ['ES256'], maxTokenAge: '5 min' })
      },
    })

    const ok = await verify({ header, rawBody })
    if (!ok) { res.status(401).send('invalid signature'); return }

    const { webhook_type: type, webhook_code: code, item_id: itemId } = req.body
    const db = adminDbAdapter()
    try {
      if (type === 'TRANSACTIONS' && (code === 'SYNC_UPDATES_AVAILABLE' || code === 'DEFAULT_UPDATE' || code === 'INITIAL_UPDATE' || code === 'HISTORICAL_UPDATE')) {
        const process = makeProcessTransactionsSync({ db, getPlaidClient, merchantToCategory })
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
