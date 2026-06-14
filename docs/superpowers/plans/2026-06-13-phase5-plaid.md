# DollarSmart Phase 5: Plaid Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each user securely link a bank via Plaid so that new card transactions are detected server-side and surfaced in-app as one-tap "log it" prompts.

**Architecture:** A new Firebase Cloud Functions backend (`functions/`, Node 20, Functions v2) holds all Plaid secrets and the access tokens — the client never sees them. Three functions: two callable (`createLinkToken`, `exchangePublicToken`) and one HTTP webhook (`plaidWebhook`) that verifies Plaid's signature, calls `transactions/sync`, maps each transaction to a category, and writes idempotent `pendingTransactions/{plaidTxId}` docs scoped to the user. The React client adds a "Connect bank" flow via `react-plaid-link` in Settings, surfaces pending transactions as a dismissible banner, and deep-links "Log it" into a pre-filled Quick Log. Push notifications are explicitly **out of scope** — that is Phase 6 (FCM); Phase 5's in-app pending-transaction surface is the testable stand-in.

**Tech Stack:** Firebase Functions v2 (`firebase-functions`, `firebase-admin`), Plaid Node SDK (`plaid`), `jose` for webhook JWT verification, Jest for function tests, `react-plaid-link` on the client, existing Vitest + `@firebase/rules-unit-testing` for rules.

**Execution notes:**
- **Prerequisites (must be done before Task 1 deploys anything):** project on Blaze plan; Plaid account with Sandbox `client_id` + `secret`; `firebase login` (done).
- **Plaid env:** Sandbox throughout this phase. `PLAID_ENV=sandbox`.
- **Qwen candidate:** Task 2 (`categoryMap.js`) is pure-logic TDD — route to Qwen. Everything else (secrets, security, Firebase wiring, React) is Claude.
- **Secrets** are stored via `firebase functions:secrets:set` (Google Secret Manager), never in git. The client `.env.local` is unchanged by this phase.

---

## File Structure

```
functions/                         # NEW Cloud Functions subproject (Node 20)
├── package.json                   # functions deps + jest + scripts
├── .gitignore                     # node_modules, .env, lib
├── index.js                       # exports the 3 functions (entry point)
├── jest.config.js                 # jest config (node env)
├── src/
│   ├── plaidClient.js             # builds a PlaidApi from secrets/env
│   ├── categoryMap.js             # merchantToCategory (pure logic) — QWEN
│   ├── webhookVerify.js           # sha256Hex + verifyPlaidWebhook (security)
│   └── handlers/
│       ├── createLinkToken.js     # onCall: returns a Plaid Link token
│       ├── exchangePublicToken.js # onCall: stores access token server-only
│       └── plaidWebhook.js        # onRequest: verify → sync → pending docs
└── test/
    ├── categoryMap.test.js
    ├── webhookVerify.test.js
    ├── createLinkToken.test.js
    ├── exchangePublicToken.test.js
    └── plaidWebhook.test.js

src/                               # existing React app
├── lib/
│   └── functions.js               # callable refs (createLinkToken, exchangePublicToken)
├── hooks/
│   ├── usePlaidConnect.js         # orchestrates the Link → exchange flow
│   └── usePendingTransactions.js  # streams the user's pending tx
├── components/
│   ├── ConnectBankButton.jsx      # opens Plaid Link
│   ├── PendingTransactionBanner.jsx
│   └── ReconnectBanner.jsx        # shown when a bank item needs re-auth
├── pages/
│   ├── SettingsPage.jsx           # MODIFY: add Connect bank + reconnect banner
│   ├── HomePage.jsx               # MODIFY: render PendingTransactionBanner
│   └── LogPage.jsx                # MODIFY: accept prefill from router state
firestore.rules                    # MODIFY: plaidItems (deny all), pendingTransactions
tests/firestore-rules.test.js      # MODIFY: add rules cases for the new collections
firebase.json                      # MODIFY: functions config + functions emulator
.firebaserc                        # unchanged (already dollarsmart-couple)
```

**Firestore collections added:**
- `plaidItems/{uid}` — `{ accessToken, itemId, cursor, status, updatedAt }`. **Server-only** (Admin SDK). Rules deny ALL client access.
- `pendingTransactions/{plaidTxId}` — `{ uid, amount, merchantName, categoryId, date, status, createdAt }`. Client may read/delete its own; only the server creates.
- `users/{uid}.bankStatus` — client-readable summary field (`'connected' | 'reauth_required' | undefined`) so the UI can show banners without reading `plaidItems`.

---

## Task 1: Cloud Functions project scaffold

**Files:**
- Create: `functions/package.json`
- Create: `functions/.gitignore`
- Create: `functions/jest.config.js`
- Create: `functions/index.js`
- Create: `functions/test/smoke.test.js`
- Modify: `firebase.json`

- [ ] **Step 1: Create `functions/package.json`**

```json
{
  "name": "dollarsmart-functions",
  "description": "Cloud Functions for DollarSmart (Plaid integration)",
  "type": "commonjs",
  "engines": { "node": "20" },
  "main": "index.js",
  "scripts": {
    "test": "jest",
    "serve": "firebase emulators:start --only functions"
  },
  "dependencies": {
    "firebase-admin": "^12.6.0",
    "firebase-functions": "^6.1.0",
    "jose": "^5.9.6",
    "plaid": "^29.0.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  },
  "private": true
}
```

- [ ] **Step 2: Create `functions/.gitignore`**

```gitignore
node_modules/
.env
.env.local
*.log
lib/
```

- [ ] **Step 3: Create `functions/jest.config.js`**

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
}
```

- [ ] **Step 4: Create `functions/index.js` (placeholder entry, real exports added in Task 8)**

```js
// Cloud Functions entry point. Individual handlers are wired in Task 8.
// Kept minimal here so the project installs and the test harness runs.
```

- [ ] **Step 5: Create `functions/test/smoke.test.js`**

```js
describe('functions test harness', () => {
  it('runs jest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Add functions config to `firebase.json`**

Replace the entire contents of `firebase.json` with:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "runtime": "nodejs20"
    }
  ],
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "ui": { "enabled": true },
    "singleProjectMode": true
  }
}
```

- [ ] **Step 7: Install and run the smoke test**

Run: `npm --prefix functions install`
Expected: dependencies install without error.

Run: `npm --prefix functions test`
Expected: PASS — 1 test (the smoke test).

- [ ] **Step 8: Commit**

```bash
git add functions/package.json functions/.gitignore functions/jest.config.js functions/index.js functions/test/smoke.test.js firebase.json
git commit -m "feat: scaffold Cloud Functions project for Plaid"
```

---

## Task 2: Merchant → category mapping (QWEN — pure logic TDD)

Maps a Plaid transaction's merchant name and Plaid personal-finance category to one of our 10 category ids. Keep it deterministic and dependency-free.

**Files:**
- Create: `functions/src/categoryMap.js`
- Test: `functions/test/categoryMap.test.js`

- [ ] **Step 1: Write the failing test `functions/test/categoryMap.test.js`**

```js
const { merchantToCategory } = require('../src/categoryMap')

describe('merchantToCategory', () => {
  it('maps a known food merchant by name keyword', () => {
    expect(merchantToCategory('CHIPOTLE 1234', null)).toBe('food')
    expect(merchantToCategory('Starbucks', null)).toBe('food')
  })

  it('maps grocery merchants', () => {
    expect(merchantToCategory('SAFEWAY #5', null)).toBe('groceries')
    expect(merchantToCategory('Trader Joe\'s', null)).toBe('groceries')
  })

  it('maps ride/transport merchants', () => {
    expect(merchantToCategory('UBER TRIP', null)).toBe('transport')
    expect(merchantToCategory('SHELL OIL', null)).toBe('transport')
  })

  it('falls back to Plaid primary category when no name match', () => {
    expect(merchantToCategory('UNKNOWN VENDOR XYZ', 'TRANSPORTATION')).toBe('transport')
    expect(merchantToCategory('UNKNOWN VENDOR XYZ', 'FOOD_AND_DRINK')).toBe('food')
    expect(merchantToCategory('UNKNOWN VENDOR XYZ', 'GENERAL_MERCHANDISE')).toBe('shopping')
  })

  it('returns "other" when nothing matches', () => {
    expect(merchantToCategory('ZZZ', null)).toBe('other')
    expect(merchantToCategory('', undefined)).toBe('other')
  })

  it('is case-insensitive on the merchant name', () => {
    expect(merchantToCategory('chipotle', null)).toBe('food')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix functions test -- categoryMap`
Expected: FAIL — `categoryMap` module not found.

- [ ] **Step 3: Write `functions/src/categoryMap.js`**

```js
// Maps a Plaid transaction to one of DollarSmart's 10 category ids.
// Strategy: try keyword match on the merchant name first (most specific),
// then fall back to Plaid's personal_finance_category.primary, then 'other'.

const NAME_KEYWORDS = [
  ['groceries', ['safeway', 'trader joe', 'whole foods', 'kroger', 'aldi', 'wegmans', 'grocery', 'supermarket']],
  ['food', ['chipotle', 'starbucks', 'mcdonald', 'restaurant', 'cafe', 'coffee', 'pizza', 'doordash', 'grubhub', 'uber eats']],
  ['transport', ['uber', 'lyft', 'shell', 'exxon', 'chevron', 'bp ', 'gas', 'parking', 'metro', 'transit']],
  ['shopping', ['amazon', 'target', 'walmart', 'best buy', 'etsy', 'ebay']],
  ['entertainment', ['netflix', 'spotify', 'hulu', 'steam', 'playstation', 'xbox', 'cinema', 'movie']],
  ['bills', ['comcast', 'verizon', 'at&t', 'electric', 'water', 'utility', 'insurance']],
  ['health', ['cvs', 'walgreens', 'pharmacy', 'clinic', 'hospital', 'dental']],
  ['travel', ['airline', 'hotel', 'airbnb', 'delta', 'united', 'marriott', 'expedia']],
  ['pets', ['petco', 'petsmart', 'chewy', 'veterinary', 'vet ']],
]

const PLAID_PRIMARY_MAP = {
  FOOD_AND_DRINK: 'food',
  GENERAL_MERCHANDISE: 'shopping',
  TRANSPORTATION: 'transport',
  TRAVEL: 'travel',
  ENTERTAINMENT: 'entertainment',
  RENT_AND_UTILITIES: 'bills',
  MEDICAL: 'health',
  PERSONAL_CARE: 'health',
}

function merchantToCategory(merchantName, plaidPrimary) {
  const name = String(merchantName ?? '').toLowerCase()
  if (name) {
    for (const [categoryId, keywords] of NAME_KEYWORDS) {
      if (keywords.some((kw) => name.includes(kw))) return categoryId
    }
  }
  if (plaidPrimary && PLAID_PRIMARY_MAP[plaidPrimary]) {
    return PLAID_PRIMARY_MAP[plaidPrimary]
  }
  return 'other'
}

module.exports = { merchantToCategory }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix functions test -- categoryMap`
Expected: PASS — all cases.

- [ ] **Step 5: Commit**

```bash
git add functions/src/categoryMap.js functions/test/categoryMap.test.js
git commit -m "feat: add Plaid merchant-to-category mapping with tests"
```

---

## Task 3: Plaid client factory

A single place that builds a configured `PlaidApi` instance from the environment. Secrets are injected by Functions v2 at runtime via `process.env`.

**Files:**
- Create: `functions/src/plaidClient.js`

- [ ] **Step 1: Write `functions/src/plaidClient.js`**

```js
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid')

/**
 * Build a PlaidApi from environment variables. Called inside handlers (not at
 * module load) so that Functions v2 secrets are available in process.env.
 *   PLAID_CLIENT_ID, PLAID_SECRET  -> from Secret Manager
 *   PLAID_ENV                      -> 'sandbox' (this phase)
 */
function getPlaidClient() {
  const env = process.env.PLAID_ENV || 'sandbox'
  const config = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
  return new PlaidApi(config)
}

module.exports = { getPlaidClient }
```

- [ ] **Step 2: Verify the module loads (no test — exercised via handler tests)**

Run: `node -e "require('./functions/src/plaidClient.js'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add functions/src/plaidClient.js
git commit -m "feat: add Plaid client factory"
```

---

## Task 4: createLinkToken callable

A callable function the client invokes to get a Plaid Link token. Requires auth; uses the caller's uid as the Plaid `client_user_id`.

**Files:**
- Create: `functions/src/handlers/createLinkToken.js`
- Test: `functions/test/createLinkToken.test.js`

- [ ] **Step 1: Write the failing test `functions/test/createLinkToken.test.js`**

```js
const { buildLinkTokenRequest, makeCreateLinkToken } = require('../src/handlers/createLinkToken')

describe('buildLinkTokenRequest', () => {
  it('builds a transactions Link request scoped to the uid', () => {
    const req = buildLinkTokenRequest('user-123', 'https://example.com/webhook')
    expect(req.user.client_user_id).toBe('user-123')
    expect(req.products).toEqual(['transactions'])
    expect(req.country_codes).toEqual(['US'])
    expect(req.language).toBe('en')
    expect(req.webhook).toBe('https://example.com/webhook')
    expect(req.client_name).toBe('DollarSmart')
  })
})

describe('makeCreateLinkToken (handler core)', () => {
  it('throws when unauthenticated', async () => {
    const handler = makeCreateLinkToken({ getPlaidClient: () => ({}), webhookUrl: 'x' })
    await expect(handler({ auth: null })).rejects.toThrow('unauthenticated')
  })

  it('returns the link token from Plaid for an authed caller', async () => {
    const fakePlaid = {
      linkTokenCreate: async () => ({ data: { link_token: 'link-sandbox-abc' } }),
    }
    const handler = makeCreateLinkToken({ getPlaidClient: () => fakePlaid, webhookUrl: 'https://w' })
    const result = await handler({ auth: { uid: 'user-123' } })
    expect(result).toEqual({ linkToken: 'link-sandbox-abc' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix functions test -- createLinkToken`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/src/handlers/createLinkToken.js`**

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix functions test -- createLinkToken`
Expected: PASS — all cases.

- [ ] **Step 5: Commit**

```bash
git add functions/src/handlers/createLinkToken.js functions/test/createLinkToken.test.js
git commit -m "feat: add createLinkToken callable"
```

---

## Task 5: exchangePublicToken callable

Exchanges the one-time `public_token` from Link for a long-lived `access_token`, stores it in the server-only `plaidItems/{uid}` doc, and marks `users/{uid}.bankStatus = 'connected'`. Never returns the access token to the client.

**Files:**
- Create: `functions/src/handlers/exchangePublicToken.js`
- Test: `functions/test/exchangePublicToken.test.js`

- [ ] **Step 1: Write the failing test `functions/test/exchangePublicToken.test.js`**

```js
const { makeExchangePublicToken } = require('../src/handlers/exchangePublicToken')

function fakeDb() {
  const writes = {}
  return {
    writes,
    doc(path) {
      return {
        set: async (data, opts) => { writes[path] = { data, opts } },
      }
    },
  }
}

describe('makeExchangePublicToken (handler core)', () => {
  it('throws when unauthenticated', async () => {
    const handler = makeExchangePublicToken({ getPlaidClient: () => ({}), db: fakeDb() })
    await expect(handler({ auth: null, data: { publicToken: 'x' } })).rejects.toThrow('unauthenticated')
  })

  it('throws when publicToken is missing', async () => {
    const handler = makeExchangePublicToken({ getPlaidClient: () => ({}), db: fakeDb() })
    await expect(handler({ auth: { uid: 'u1' }, data: {} })).rejects.toThrow('publicToken')
  })

  it('stores the access token server-side and marks the user connected', async () => {
    const db = fakeDb()
    const fakePlaid = {
      itemPublicTokenExchange: async () => ({
        data: { access_token: 'access-sandbox-xyz', item_id: 'item-1' },
      }),
    }
    const handler = makeExchangePublicToken({ getPlaidClient: () => fakePlaid, db })
    const result = await handler({ auth: { uid: 'u1' }, data: { publicToken: 'public-sandbox' } })

    expect(result).toEqual({ ok: true })
    // access token goes to the server-only collection, NOT returned to client
    expect(db.writes['plaidItems/u1'].data.accessToken).toBe('access-sandbox-xyz')
    expect(db.writes['plaidItems/u1'].data.itemId).toBe('item-1')
    expect(db.writes['plaidItems/u1'].data.cursor).toBe(null)
    expect(db.writes['plaidItems/u1'].data.status).toBe('connected')
    // client-readable summary on the user doc
    expect(db.writes['users/u1'].data.bankStatus).toBe('connected')
    expect(db.writes['users/u1'].opts).toEqual({ merge: true })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix functions test -- exchangePublicToken`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/src/handlers/exchangePublicToken.js`**

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix functions test -- exchangePublicToken`
Expected: PASS — all cases.

- [ ] **Step 5: Commit**

```bash
git add functions/src/handlers/exchangePublicToken.js functions/test/exchangePublicToken.test.js
git commit -m "feat: add exchangePublicToken callable storing tokens server-side"
```

---

## Task 6: Webhook verification helpers

Plaid signs webhooks with a JWT in the `Plaid-Verification` header (ES256). Verification = (1) fetch the verification key by `kid`, (2) verify the JWT signature, (3) confirm the JWT's `request_body_sha256` equals the SHA-256 of the raw request body. We unit-test the pure pieces (hashing, body-match) and the orchestration with injected dependencies.

**Files:**
- Create: `functions/src/webhookVerify.js`
- Test: `functions/test/webhookVerify.test.js`

- [ ] **Step 1: Write the failing test `functions/test/webhookVerify.test.js`**

```js
const crypto = require('crypto')
const { sha256Hex, bodyMatchesHash, makeVerifyWebhook } = require('../src/webhookVerify')

describe('sha256Hex', () => {
  it('hashes a string to lowercase hex', () => {
    const body = '{"a":1}'
    const expected = crypto.createHash('sha256').update(body, 'utf8').digest('hex')
    expect(sha256Hex(body)).toBe(expected)
  })
})

describe('bodyMatchesHash', () => {
  it('true when the body hash matches', () => {
    const body = '{"webhook_type":"TRANSACTIONS"}'
    expect(bodyMatchesHash(body, sha256Hex(body))).toBe(true)
  })
  it('false when the body was tampered with', () => {
    const body = '{"webhook_type":"TRANSACTIONS"}'
    expect(bodyMatchesHash('{"webhook_type":"AUTH"}', sha256Hex(body))).toBe(false)
  })
})

describe('makeVerifyWebhook', () => {
  const rawBody = '{"webhook_type":"TRANSACTIONS","webhook_code":"SYNC_UPDATES_AVAILABLE"}'

  it('rejects when the verification header is missing', async () => {
    const verify = makeVerifyWebhook({
      getKey: async () => ({}),
      verifyJwt: async () => ({}),
    })
    await expect(verify({ header: undefined, rawBody })).resolves.toBe(false)
  })

  it('rejects when the body hash does not match the JWT claim', async () => {
    const verify = makeVerifyWebhook({
      getKey: async () => ({ kty: 'EC' }),
      verifyJwt: async () => ({ payload: { request_body_sha256: 'deadbeef' } }),
    })
    await expect(verify({ header: 'jwt.token.here', rawBody })).resolves.toBe(false)
  })

  it('accepts when signature verifies and body hash matches', async () => {
    const verify = makeVerifyWebhook({
      getKey: async () => ({ kty: 'EC' }),
      verifyJwt: async () => ({ payload: { request_body_sha256: sha256Hex(rawBody) } }),
    })
    await expect(verify({ header: 'jwt.token.here', rawBody })).resolves.toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix functions test -- webhookVerify`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/src/webhookVerify.js`**

```js
const crypto = require('crypto')
const jose = require('jose')

function sha256Hex(body) {
  return crypto.createHash('sha256').update(body, 'utf8').digest('hex')
}

function bodyMatchesHash(rawBody, expectedSha256) {
  const actual = sha256Hex(rawBody)
  // constant-time compare to avoid timing leaks
  const a = Buffer.from(actual)
  const b = Buffer.from(String(expectedSha256))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * Testable verification core. Dependencies injected:
 *  - getKey(kid): returns the JWK for the given key id (from Plaid)
 *  - verifyJwt(token, jwk): returns { payload } or throws
 * Returns true only if the JWT verifies AND the body hash matches.
 */
function makeVerifyWebhook({ getKey, verifyJwt }) {
  return async function ({ header, rawBody }) {
    if (!header) return false
    try {
      const decodedHeader = jose.decodeProtectedHeader
        ? safeDecodeKid(header)
        : null
      const jwk = await getKey(decodedHeader)
      const { payload } = await verifyJwt(header, jwk)
      if (!payload || !payload.request_body_sha256) return false
      return bodyMatchesHash(rawBody, payload.request_body_sha256)
    } catch {
      return false
    }
  }
}

function safeDecodeKid(token) {
  try {
    return jose.decodeProtectedHeader(token).kid
  } catch {
    return null
  }
}

module.exports = { sha256Hex, bodyMatchesHash, makeVerifyWebhook, safeDecodeKid }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix functions test -- webhookVerify`
Expected: PASS — all cases.

- [ ] **Step 5: Commit**

```bash
git add functions/src/webhookVerify.js functions/test/webhookVerify.test.js
git commit -m "feat: add Plaid webhook verification helpers with tests"
```

---

## Task 7: plaidWebhook handler — transaction sync → pending docs

The HTTP webhook. On a verified `TRANSACTIONS / SYNC_UPDATES_AVAILABLE` event, look up the item by `item_id`, call `transactions/sync` from the stored cursor, map each added transaction to a category, and write an idempotent `pendingTransactions/{plaidTxId}` doc. Update the cursor. On `ITEM` error webhooks (login required) set `users/{uid}.bankStatus = 'reauth_required'`.

**Files:**
- Create: `functions/src/handlers/plaidWebhook.js`
- Test: `functions/test/plaidWebhook.test.js`

- [ ] **Step 1: Write the failing test `functions/test/plaidWebhook.test.js`**

```js
const { makeProcessTransactionsSync } = require('../src/handlers/plaidWebhook')

function fakeDb(initialItems) {
  const writes = {}
  return {
    writes,
    doc(path) {
      return {
        set: async (data, opts) => { writes[path] = { ...(writes[path] || {}), data, opts } },
      }
    },
    // find a plaidItems doc by itemId
    async findItemByItemId(itemId) {
      const entry = Object.entries(initialItems).find(([, v]) => v.itemId === itemId)
      if (!entry) return null
      return { uid: entry[0].split('/')[1], data: entry[1] }
    },
  }
}

describe('makeProcessTransactionsSync', () => {
  it('writes a pending transaction per added tx and advances the cursor', async () => {
    const db = fakeDb({ 'plaidItems/u1': { itemId: 'item-1', accessToken: 'acc', cursor: null } })
    const fakePlaid = {
      transactionsSync: async () => ({
        data: {
          added: [
            { transaction_id: 'tx-1', amount: 24.5, merchant_name: 'Chipotle', date: '2026-06-13',
              personal_finance_category: { primary: 'FOOD_AND_DRINK' } },
          ],
          has_more: false,
          next_cursor: 'cursor-2',
        },
      }),
    }
    const process = makeProcessTransactionsSync({
      db, getPlaidClient: () => fakePlaid, merchantToCategory: () => 'food',
    })

    await process('item-1')

    expect(db.writes['pendingTransactions/tx-1'].data).toMatchObject({
      uid: 'u1', amount: 24.5, merchantName: 'Chipotle', categoryId: 'food',
      date: '2026-06-13', status: 'pending',
    })
    expect(db.writes['plaidItems/u1'].data.cursor).toBe('cursor-2')
  })

  it('does nothing when the item is unknown', async () => {
    const db = fakeDb({})
    const process = makeProcessTransactionsSync({
      db, getPlaidClient: () => ({}), merchantToCategory: () => 'other',
    })
    await process('item-unknown')
    expect(Object.keys(db.writes)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix functions test -- plaidWebhook`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/src/handlers/plaidWebhook.js`**

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix functions test -- plaidWebhook`
Expected: PASS — both cases.

- [ ] **Step 5: Run the full functions suite**

Run: `npm --prefix functions test`
Expected: PASS — smoke, categoryMap, createLinkToken, exchangePublicToken, webhookVerify, plaidWebhook.

- [ ] **Step 6: Commit**

```bash
git add functions/src/handlers/plaidWebhook.js functions/test/plaidWebhook.test.js
git commit -m "feat: add plaidWebhook handler with transaction sync and reauth handling"
```

---

## Task 8: Wire function exports, Firestore rules, and rules tests

Export the three functions from `index.js`, initialize the Admin SDK once, and lock down the new collections.

**Files:**
- Modify: `functions/index.js`
- Modify: `firestore.rules`
- Modify: `tests/firestore-rules.test.js`

- [ ] **Step 1: Replace `functions/index.js`**

```js
const admin = require('firebase-admin')
admin.initializeApp()

const { createLinkToken } = require('./src/handlers/createLinkToken')
const { exchangePublicToken } = require('./src/handlers/exchangePublicToken')
const { plaidWebhook } = require('./src/handlers/plaidWebhook')

module.exports = { createLinkToken, exchangePublicToken, plaidWebhook }
```

- [ ] **Step 2: Add rules for the new collections in `firestore.rules`**

Insert these two blocks immediately before the closing `}` of the `match /databases/{database}/documents {` block (after the `inviteCodes` block):

```
    // plaidItems/{uid}: holds the user's Plaid access token. SERVER-ONLY.
    // No client may ever read or write this; only the Admin SDK (Cloud
    // Functions) bypasses rules. Deny everything explicitly.
    match /plaidItems/{uid} {
      allow read, write: if false;
    }

    // pendingTransactions/{txId}: detected transactions awaiting the user's
    // confirmation. Only the server (Admin SDK) creates them. The owning user
    // may read and delete (dismiss/confirm) their own; no client creates/updates.
    match /pendingTransactions/{txId} {
      allow read, delete: if isUser(resource.data.uid);
      allow create, update: if false;
    }
```

- [ ] **Step 3: Add rules tests in `tests/firestore-rules.test.js`**

Add these test cases inside the existing top-level `describe` (use the existing helpers in that file for getting authed/unauthed contexts — match the file's existing style for creating a test env and seeding docs). Add:

```js
describe('plaidItems (server-only)', () => {
  it('denies any client read', async () => {
    const alice = testEnv.authenticatedContext('alice')
    await assertFails(getDoc(doc(alice.firestore(), 'plaidItems/alice')))
  })

  it('denies any client write', async () => {
    const alice = testEnv.authenticatedContext('alice')
    await assertFails(setDoc(doc(alice.firestore(), 'plaidItems/alice'), { accessToken: 'x' }))
  })
})

describe('pendingTransactions', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'pendingTransactions/tx1'), {
        uid: 'alice', amount: 10, merchantName: 'Chipotle', categoryId: 'food',
        date: '2026-06-13', status: 'pending',
      })
    })
  })

  it('lets the owner read their pending transaction', async () => {
    const alice = testEnv.authenticatedContext('alice')
    await assertSucceeds(getDoc(doc(alice.firestore(), 'pendingTransactions/tx1')))
  })

  it('forbids another user from reading it', async () => {
    const bob = testEnv.authenticatedContext('bob')
    await assertFails(getDoc(doc(bob.firestore(), 'pendingTransactions/tx1')))
  })

  it('lets the owner delete (dismiss) it', async () => {
    const alice = testEnv.authenticatedContext('alice')
    await assertSucceeds(deleteDoc(doc(alice.firestore(), 'pendingTransactions/tx1')))
  })

  it('forbids any client from creating one', async () => {
    const alice = testEnv.authenticatedContext('alice')
    await assertFails(setDoc(doc(alice.firestore(), 'pendingTransactions/tx2'), {
      uid: 'alice', amount: 5, status: 'pending',
    }))
  })
})
```

> **Note:** If the existing test file does not already import `assertSucceeds`, `deleteDoc`, `setDoc`, `getDoc`, or `doc`, add them to the existing imports at the top (from `@firebase/rules-unit-testing` and `firebase/firestore` respectively). Reuse the file's existing `testEnv` setup — do not create a second one.

- [ ] **Step 4: Run the rules tests against the emulator**

Run (terminal 1): `npm run test:rules` (this script starts the emulator-backed Vitest config per the project's existing setup; if it requires the emulator running separately, start it with `npx firebase emulators:start --only firestore` in another terminal first).
Expected: PASS — existing 8 rules tests plus the 6 new ones.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js firestore.rules tests/firestore-rules.test.js
git commit -m "feat: wire function exports and lock down plaidItems/pendingTransactions"
```

---

## Task 9: Deploy backend + set secrets + capture webhook URL

This is the one-time deploy that turns the functions on, sets the Plaid secrets in Secret Manager, and wires the webhook URL back into the link-token config. **Requires Blaze + Plaid Sandbox keys.**

**Files:**
- None (deploy + config only)

- [ ] **Step 1: Set the Plaid secrets (interactive — run in your own terminal)**

Run:
```
npx firebase functions:secrets:set PLAID_CLIENT_ID
npx firebase functions:secrets:set PLAID_SECRET
```
Paste the Sandbox `client_id` and Sandbox `secret` from the Plaid dashboard when prompted.
Expected: each prints `✔ Created a new secret version`.

- [ ] **Step 2: Set non-secret params via functions env**

Create `functions/.env` (git-ignored already) with:
```
PLAID_ENV=sandbox
```
> `PLAID_WEBHOOK_URL` is added in Step 5 once we know the deployed URL.

- [ ] **Step 3: First deploy (gets us the webhook URL)**

Run: `npx firebase deploy --only functions`
Expected: deploy succeeds; the output lists the `plaidWebhook` function URL, e.g.
`Function URL (plaidWebhook(us-central1)): https://plaidwebhook-xxxxx-uc.a.run.app`
Copy that URL.

- [ ] **Step 4: Verify functions are live**

Run: `npx firebase functions:list`
Expected: `createLinkToken`, `exchangePublicToken`, `plaidWebhook` all listed.

- [ ] **Step 5: Wire the webhook URL and redeploy**

Append to `functions/.env`:
```
PLAID_WEBHOOK_URL=<paste the plaidWebhook URL from Step 3>
```
Run: `npx firebase deploy --only functions`
Expected: deploy succeeds; `createLinkToken` now passes this webhook to Plaid.

- [ ] **Step 6: Commit (env file is git-ignored, so this commits nothing code-wise — skip if no tracked changes)**

```bash
git status   # confirm functions/.env is NOT staged (it is git-ignored)
```
No commit needed for this task unless tracked files changed.

---

## Task 10: Client — Plaid Link connect flow in Settings

Add `react-plaid-link`, a callable-wiring module, a connect hook, and a Connect Bank button in Settings.

**Files:**
- Modify: `package.json` (add `react-plaid-link`)
- Create: `src/lib/functions.js`
- Create: `src/hooks/usePlaidConnect.js`
- Create: `src/components/ConnectBankButton.jsx`
- Modify: `src/pages/SettingsPage.jsx`

- [ ] **Step 1: Install the client SDK**

Run: `npm install react-plaid-link`
Expected: added to `package.json` dependencies.

- [ ] **Step 2: Create `src/lib/functions.js`**

```js
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase/client.js'

const functions = getFunctions(app)

export const createLinkToken = httpsCallable(functions, 'createLinkToken')
export const exchangePublicToken = httpsCallable(functions, 'exchangePublicToken')
```

- [ ] **Step 3: Create `src/hooks/usePlaidConnect.js`**

```js
import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { createLinkToken, exchangePublicToken } from '../lib/functions.js'

/**
 * Orchestrates the Plaid Link flow:
 *  1. fetch a link token from our callable
 *  2. open Plaid Link once it's ready
 *  3. on success, exchange the public token via our callable
 * Returns { start, loading, error } for a button to use.
 */
export function usePlaidConnect() {
  const [linkToken, setLinkToken] = useState(null)
  const [pendingOpen, setPendingOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onSuccess = useCallback(async (publicToken) => {
    setLoading(true)
    try {
      await exchangePublicToken({ publicToken })
    } catch (e) {
      setError('Could not finish connecting your bank.')
    } finally {
      setLoading(false)
    }
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  })

  const start = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await createLinkToken()
      setLinkToken(res.data.linkToken)
      setPendingOpen(true)
    } catch (e) {
      setError('Could not start bank connection.')
      setLoading(false)
    }
  }, [])

  // Open Link once we have a token AND the SDK reports ready. Done in an
  // effect (not during render) to avoid side effects in the render path.
  useEffect(() => {
    if (pendingOpen && linkToken && ready) {
      setPendingOpen(false)
      setLoading(false)
      open()
    }
  }, [pendingOpen, linkToken, ready, open])

  return { start, loading, error }
}
```

- [ ] **Step 4: Create `src/components/ConnectBankButton.jsx`**

```jsx
import { usePlaidConnect } from '../hooks/usePlaidConnect.js'

export default function ConnectBankButton({ label = 'Connect bank account' }) {
  const { start, loading, error } = usePlaidConnect()
  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <button
        className="btn btn-secondary"
        style={{ width: '100%' }}
        onClick={start}
        disabled={loading}
      >
        {loading ? 'Connecting…' : label}
      </button>
      {error && <p style={{ color: '#F87171', fontSize: '0.8rem', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Add the button to `src/pages/SettingsPage.jsx`**

Add the import near the other imports:
```jsx
import ConnectBankButton from '../components/ConnectBankButton.jsx'
```

Add this block immediately above the "Export all expenses as CSV" button:
```jsx
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h3 style={{ fontSize: '1rem', color: '#CBD5E1' }}>Bank connection</h3>
        <ConnectBankButton />
      </div>
```

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/functions.js src/hooks/usePlaidConnect.js src/components/ConnectBankButton.jsx src/pages/SettingsPage.jsx
git commit -m "feat: add Plaid Link connect-bank flow in Settings"
```

---

## Task 11: Client — pending transactions banner + Log-it deep link

Stream the user's pending transactions, show a banner, and let "Log it" / "Split it" pre-fill Quick Log. Confirming or dismissing removes the pending doc.

**Files:**
- Create: `src/hooks/usePendingTransactions.js`
- Create: `src/components/PendingTransactionBanner.jsx`
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/LogPage.jsx`

- [ ] **Step 1: Create `src/hooks/usePendingTransactions.js`**

```js
import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/**
 * Streams the current user's pending (Plaid-detected, unconfirmed) transactions.
 */
export function usePendingTransactions() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])

  useEffect(() => {
    if (!user) { setPending([]); return }
    const q = query(
      collection(db, 'pendingTransactions'),
      where('uid', '==', user.uid),
      where('status', '==', 'pending'),
    )
    return onSnapshot(q, (snap) => {
      setPending(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [user])

  return pending
}
```

- [ ] **Step 2: Create `src/components/PendingTransactionBanner.jsx`**

```jsx
import { useNavigate } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { getCategory } from '../lib/categories.js'

/**
 * Shows the most recent pending transaction with one-tap actions:
 *  - Log it: deep-links to Quick Log pre-filled (personal)
 *  - Split it: same but split ÷2 into the shared pool
 *  - Dismiss: deletes the pending doc
 */
export default function PendingTransactionBanner() {
  const pending = usePendingTransactions()
  const navigate = useNavigate()
  if (pending.length === 0) return null

  const tx = pending[0]
  const cat = getCategory(tx.categoryId)

  async function dismiss() {
    await deleteDoc(doc(db, 'pendingTransactions', tx.id))
  }

  function logIt(split) {
    navigate('/log', {
      state: {
        prefillAmount: tx.amount,
        prefillCategoryId: tx.categoryId,
        prefillSplit: split,
        pendingId: tx.id,
      },
    })
  }

  return (
    <div style={{
      width: '100%', maxWidth: 420, background: '#1E293B', borderRadius: 12,
      padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
    }}>
      <div style={{ fontSize: '0.9rem' }}>
        {cat.emoji} Looks like you spent <strong>${tx.amount.toFixed(2)}</strong> at {tx.merchantName} — log it?
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => logIt(false)}>Log it</button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => logIt(true)}>Split it</button>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '1.2rem' }}
          title="Dismiss"
        >×</button>
      </div>
    </div>
  )
}
```

> **Import note:** add `import { usePendingTransactions } from '../hooks/usePendingTransactions.js'` at the top of this file (kept in the same task to keep the component self-contained).

- [ ] **Step 3: Render the banner on `src/pages/HomePage.jsx`**

Add the import:
```jsx
import PendingTransactionBanner from '../components/PendingTransactionBanner.jsx'
```

Add `<PendingTransactionBanner />` immediately after the `<StreakBadge ... />` line.

- [ ] **Step 4: Make `src/pages/LogPage.jsx` accept prefill from router state**

At the top of the component, read router state and use it as initial values. Add the import:
```jsx
import { useNavigate, useLocation } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
```
(Adjust the existing `useNavigate` import line so it also imports `useLocation`; add the firestore imports.)

Replace the initial `useState` lines for amount/category/pool with prefill-aware versions:
```jsx
  const location = useLocation()
  const prefill = location.state || {}

  const [amountText, setAmountText] = useState(prefill.prefillAmount != null ? String(prefill.prefillAmount) : '')
  const [categoryId, setCategoryId] = useState(prefill.prefillCategoryId ?? null)
  const [type, setType] = useState('expense')
  const [poolType, setPoolType] = useState(prefill.prefillSplit ? 'split' : 'personal')
```

In `handleSave`, after the existing `await addExpense(...)` call succeeds and before `navigate('/', ...)`, delete the originating pending transaction if present:
```jsx
      if (prefill.pendingId) {
        await deleteDoc(doc(db, 'pendingTransactions', prefill.pendingId)).catch(() => {})
      }
```

> Apply the split amount when prefilled: if `prefill.prefillSplit` is true and an amount was prefilled, the existing `handleSplit` logic is not auto-run; instead the saved amount stays the full amount with `poolType='split'`, matching how manual split works (splitInHalf is a user action). Leave amount as the full detected amount; poolType='split' is the meaningful signal. No extra code needed.

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/usePendingTransactions.js src/components/PendingTransactionBanner.jsx src/pages/HomePage.jsx src/pages/LogPage.jsx
git commit -m "feat: surface pending Plaid transactions with one-tap log/split/dismiss"
```

---

## Task 12: Client — reconnect banner on token expiry

When `users/{uid}.bankStatus === 'reauth_required'`, show a gentle, non-blocking banner prompting reconnection (re-runs the same Link flow).

**Files:**
- Create: `src/components/ReconnectBanner.jsx`
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Create `src/components/ReconnectBanner.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import ConnectBankButton from './ConnectBankButton.jsx'

/**
 * Non-blocking banner shown only when the user's bank connection needs a
 * refresh (Plaid ITEM_LOGIN_REQUIRED / expiration). Reuses the connect flow.
 */
export default function ReconnectBanner() {
  const { user } = useAuth()
  const [status, setStatus] = useState(undefined)

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setStatus(snap.exists() ? snap.data().bankStatus : undefined)
    })
  }, [user])

  if (status !== 'reauth_required') return null

  return (
    <div style={{
      width: '100%', maxWidth: 420, background: '#422006', border: '1px solid #92400E',
      borderRadius: 12, padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ fontSize: '0.9rem', color: '#FDE68A' }}>
        Your bank connection needs a refresh — reconnect to keep detecting transactions.
      </div>
      <ConnectBankButton label="Reconnect bank" />
    </div>
  )
}
```

- [ ] **Step 2: Render it on `src/pages/HomePage.jsx`**

Add the import:
```jsx
import ReconnectBanner from '../components/ReconnectBanner.jsx'
```

Add `<ReconnectBanner />` immediately after the `<PendingTransactionBanner />` line.

- [ ] **Step 3: Verify the build compiles and the full app test suite passes**

Run: `npm run build`
Expected: build succeeds.

Run: `npm test`
Expected: all existing Vitest unit tests pass (categories, expense, household, budget, streak, csv).

Run: `npm --prefix functions test`
Expected: all functions Jest tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ReconnectBanner.jsx src/pages/HomePage.jsx
git commit -m "feat: add bank reconnect banner on token expiry"
```

---

## Task 13: End-to-end Sandbox verification

Manual verification using Plaid Sandbox (no real bank). Confirms the whole pipeline.

**Files:**
- None (manual test)

- [ ] **Step 1: Connect a Sandbox bank**

Run the app (`npm run dev`), open Settings → Connect bank account.
In the Plaid Link Sandbox dialog, choose any institution and use credentials `user_good` / `pass_good`.
Expected: Link completes; no error banner. In Firestore console, `plaidItems/{yourUid}` exists with an `accessToken`, and `users/{yourUid}.bankStatus === 'connected'`.

- [ ] **Step 2: Fire a Sandbox transaction webhook**

Plaid Sandbox auto-generates transactions on link. To force a sync webhook, use the Plaid dashboard's Sandbox webhook tool or the `/sandbox/item/fire_webhook` endpoint for `SYNC_UPDATES_AVAILABLE`. (If using the API: it requires the access token — do this via a temporary script or the Plaid dashboard, not the client.)
Expected: `plaidWebhook` logs show a 200; `pendingTransactions` gets one or more docs scoped to your uid.

- [ ] **Step 3: Confirm the in-app prompt**

Reload the app Home screen.
Expected: the PendingTransactionBanner appears ("Looks like you spent $X at …"). Tap **Log it** → Quick Log opens pre-filled with amount + category → Save → returns Home, the pending banner for that tx is gone, and the expense appears in the Expenses feed.

- [ ] **Step 4: Confirm dismiss**

If multiple pending exist, tap the **×** on the banner.
Expected: that pending doc is deleted and the next pending (if any) shows, else the banner disappears.

- [ ] **Step 5: No commit (manual verification only)**

---

## Phase 5 Done — Definition of Complete

- [ ] `npm --prefix functions test` passes (categoryMap, createLinkToken, exchangePublicToken, webhookVerify, plaidWebhook)
- [ ] `npm test` and `npm run test:rules` pass (including new plaidItems/pendingTransactions rules)
- [ ] Functions deployed; `createLinkToken`, `exchangePublicToken`, `plaidWebhook` live
- [ ] Plaid secrets in Secret Manager (never in git); `functions/.env` git-ignored
- [ ] User can connect a Sandbox bank from Settings; access token stored server-only in `plaidItems`, never exposed to the client
- [ ] Webhook signature verified (ES256 JWT + body-hash) before any processing; unverified requests get 401
- [ ] Detected transactions become `pendingTransactions` docs, idempotent by `plaidTxId`
- [ ] In-app banner offers Log it / Split it / Dismiss; Log it deep-links to a pre-filled Quick Log and clears the pending doc on save
- [ ] Reconnect banner appears when `bankStatus === 'reauth_required'`

**Next phase:** Phase 6 — Notifications (FCM): turn the in-app pending-transaction surface into real push notifications ("Looks like you spent $24.50 at Chipotle 🍔 — log it?"), plus the other notification types (shared-target 80%, partner logged shared, daily nudge, weekly AI insight). Requires FCM web setup (VAPID key, service worker messaging) and, for iPhone, the installed-PWA push path already scaffolded in Phase 2.
```
