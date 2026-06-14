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
