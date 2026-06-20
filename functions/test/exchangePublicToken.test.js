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
    await expect(handler({ auth: null, data: { publicToken: 'x' } })).rejects.toThrow('Sign in required')
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
    // access token goes to a per-bank server-only doc keyed by item_id
    expect(db.writes['plaidConnections/item-1'].data.accessToken).toBe('access-sandbox-xyz')
    expect(db.writes['plaidConnections/item-1'].data.itemId).toBe('item-1')
    expect(db.writes['plaidConnections/item-1'].data.uid).toBe('u1')
    expect(db.writes['plaidConnections/item-1'].data.cursor).toBe(null)
    expect(db.writes['plaidConnections/item-1'].data.status).toBe('connected')
    // client-readable summary on the user doc
    expect(db.writes['users/u1'].data.bankStatus).toBe('connected')
    expect(db.writes['users/u1'].opts).toEqual({ merge: true })
  })
})
