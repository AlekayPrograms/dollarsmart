const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const jose = require('jose')
const { getPlaidClient } = require('../plaidClient')
const { merchantToCategory } = require('../categoryMap')
const { makeVerifyWebhook, safeDecodeKid } = require('../webhookVerify')
const { makeSendTransactionAlert } = require('../notifications')
const { computeSettleBalance, p2pMethod, roundCents } = require('../settle')

const PLAID_CLIENT_ID = 'PLAID_CLIENT_ID'
const PLAID_SECRET = 'PLAID_SECRET'

// --- Firestore helpers over the real Admin SDK, matching the fakeDb shape ---
function adminDbAdapter() {
  const fs = admin.firestore()
  return {
    doc: (path) => fs.doc(path),
    async findItemByItemId(itemId) {
      // New model: one doc per connected bank, keyed by Plaid item_id.
      const snap = await fs.doc(`plaidConnections/${itemId}`).get()
      if (snap.exists) {
        return { uid: snap.data().uid, itemId, data: snap.data(), cursorPath: `plaidConnections/${itemId}` }
      }
      // Legacy fallback: the old one-bank-per-user collection.
      const q = await fs.collection('plaidItems').where('itemId', '==', itemId).limit(1).get()
      if (q.empty) return null
      const d = q.docs[0]
      return { uid: d.id, itemId, data: d.data(), cursorPath: `plaidItems/${d.id}` }
    },
    // Returns this user's settle-up context ({ householdId, partnerUid, balance })
    // or null if they're not in a two-person household. Used to recognize partner
    // reimbursements (Venmo/Zelle) instead of treating them as income/spending.
    async getSettleContext(uid) {
      const userSnap = await fs.doc(`users/${uid}`).get()
      const householdId = userSnap.exists ? userSnap.data().householdId : null
      if (!householdId) return null
      const hhSnap = await fs.doc(`households/${householdId}`).get()
      if (!hhSnap.exists) return null
      const memberUids = hhSnap.data().memberUids || []
      const partnerUid = memberUids.find((u) => u !== uid)
      if (!partnerUid) return null
      const [expSnap, setSnap] = await Promise.all([
        fs.collection('expenses').where('householdId', '==', householdId).where('poolType', '==', 'split').get(),
        fs.collection('settlements').where('householdId', '==', householdId).get(),
      ])
      const splitExpenses = expSnap.docs.map((d) => d.data())
      const settlements = setSnap.docs.map((d) => d.data())
      const balance = computeSettleBalance({ splitExpenses, settlements, meUid: uid, partnerUid })
      return { householdId, partnerUid, balance }
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
      const { added = [], modified = [], removed = [], has_more: more, next_cursor: next } = res.data

      // Only enqueue a transaction once it has POSTED. Plaid surfaces each
      // transaction first as pending and again when it posts, so logging on
      // pending would prompt the user twice and use a non-final (preauth)
      // amount. The posted transition arrives either as a fresh `added` row
      // (new id) or as a `modified` row flipping `pending` to false (same id),
      // so we consider both. Keyed by transaction_id, this is idempotent.
      for (const tx of [...added, ...modified]) {
        if (tx.pending) continue          // wait for it to post
        const primary = tx.personal_finance_category && tx.personal_finance_category.primary
        // Recognize common P2P transfers (Zelle, Venmo, Cash App, PayPal) by
        // name so an incoming one always counts as income even when Plaid's
        // category doesn't say so.
        const looksLikeP2P = /zelle|venmo|cash ?app|paypal/i.test(`${tx.merchant_name || ''} ${tx.name || ''}`)
        let amount = Math.abs(tx.amount)

        // --- Settle-up interception for partner reimbursements ---
        // When a P2P transfer involves a partner who owes (or is owed) money, it
        // is a reimbursement, not income/spending. We only RECORD the settlement
        // on the receiver's inflow side (idempotent, keyed by transaction_id) so
        // that if both partners' banks are connected we don't settle twice; the
        // payer's outflow side is merely suppressed from the quick-log prompt.
        if (looksLikeP2P && typeof db.getSettleContext === 'function') {
          const ctx = await db.getSettleContext(item.uid)
          if (ctx && ctx.partnerUid) {
            if (tx.amount < 0 && ctx.balance > 0.005) {
              // Partner is paying me back. Apply up to the outstanding balance.
              const settleAmount = Math.min(amount, ctx.balance)
              let created = true
              try {
                await db.doc(`settlements/auto_${tx.transaction_id}`).create({
                  householdId: ctx.householdId, fromUid: ctx.partnerUid, toUid: item.uid,
                  amount: roundCents(settleAmount), method: p2pMethod(tx), auto: true,
                  date: tx.date, createdAt: new Date().toISOString(),
                })
              } catch { created = false }
              if (!created) continue // already auto-settled this transaction
              const remainder = roundCents(amount - settleAmount)
              if (remainder < 0.01) continue // fully a reimbursement — no prompt
              amount = remainder // log only the leftover as income below
            } else if (tx.amount > 0 && ctx.balance < -0.005) {
              // I'm reimbursing my partner — suppress the duplicate expense prompt.
              continue
            }
          }
        }

        // Plaid uses positive amounts for outflow (spending) and negative for
        // inflow (deposits, refunds, transfers). Prompt to log spending as an
        // expense, and genuine deposits (paychecks, transfers in, P2P in) as
        // income. Skip everything else (refunds, transfers out) to avoid noise.
        let entryType
        if (tx.amount > 0) {
          // Skip credit-card / loan payoffs (e.g. paying a card off from BofA).
          // The underlying purchases are already captured on that card, so
          // logging the payment too would double-count.
          if (primary === 'LOAN_PAYMENTS') continue
          entryType = 'expense'
        } else if (tx.amount < 0 && (primary === 'INCOME' || primary === 'TRANSFER_IN' || looksLikeP2P)) {
          entryType = 'income'
        } else continue

        const categoryId = entryType === 'income'
          ? 'other'
          : merchantToCategory(tx.merchant_name || tx.name, primary)

        // Atomic create keyed by transaction_id. If Plaid delivers overlapping
        // webhooks (e.g. SYNC_UPDATES_AVAILABLE + DEFAULT_UPDATE) that race
        // through this loop, only ONE create succeeds; the rest throw and skip
        // the alert — so the user is prompted exactly once per transaction.
        try {
          await db.doc(`pendingTransactions/${tx.transaction_id}`).create({
            uid: item.uid,
            amount,
            merchantName: tx.merchant_name || tx.name || 'Unknown',
            categoryId,
            entryType,
            date: tx.date,
            status: 'pending',
            createdAt: new Date().toISOString(),
          })
        } catch {
          continue // already queued (idempotent across concurrent deliveries)
        }
        await sendAlert(item.uid, { ...tx, amount, categoryId, entryType }, tx.transaction_id)
      }

      // When a pending row is removed (e.g. replaced by its posted version),
      // clear any queue entry we may have created for it under that id.
      for (const r of removed) {
        await db.doc(`pendingTransactions/${r.transaction_id || r}`).delete()
      }

      cursor = next
      hasMore = more
      // Persist the cursor after each page so a mid-pagination failure resumes
      // forward on Plaid's retry instead of re-processing earlier pages.
      await db.doc(item.cursorPath || `plaidConnections/${itemId}`).set({ cursor: cursor || null }, { merge: true })
    }
  }
}

// Mark a user as needing re-auth (ITEM_LOGIN_REQUIRED etc.)
async function markReauthRequired(db, itemId) {
  const item = await db.findItemByItemId(itemId)
  if (!item) return
  await db.doc(item.cursorPath || `plaidConnections/${itemId}`).set({ status: 'reauth_required' }, { merge: true })
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
