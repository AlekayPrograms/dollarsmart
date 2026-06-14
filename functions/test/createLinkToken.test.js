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
    await expect(handler({ auth: null })).rejects.toThrow('Sign in required')
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
