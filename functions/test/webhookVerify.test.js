const crypto = require('crypto')
const jose = require('jose')
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

// Exercises the REAL crypto path (ES256 signing + jose verify), not stubs, so
// that dropping the algorithm pin or token-age check would fail a test.
describe('makeVerifyWebhook with real ES256 crypto', () => {
  const rawBody = '{"webhook_type":"TRANSACTIONS","webhook_code":"SYNC_UPDATES_AVAILABLE"}'
  let publicJwk
  let privateKey

  const realVerifyJwt = async (token, jwk) => {
    const key = await jose.importJWK(jwk, 'ES256')
    return jose.jwtVerify(token, key, { algorithms: ['ES256'], maxTokenAge: '5 min' })
  }

  beforeAll(async () => {
    const pair = await jose.generateKeyPair('ES256')
    privateKey = pair.privateKey
    publicJwk = await jose.exportJWK(pair.publicKey)
    publicJwk.alg = 'ES256'
  })

  function verifyWith(getKey) {
    return makeVerifyWebhook({ getKey, verifyJwt: realVerifyJwt })
  }

  it('accepts a fresh ES256 token whose body hash matches', async () => {
    const token = await new jose.SignJWT({ request_body_sha256: sha256Hex(rawBody) })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuedAt()
      .sign(privateKey)
    await expect(verifyWith(async () => publicJwk)({ header: token, rawBody })).resolves.toBe(true)
  })

  it('rejects an expired token (iat older than max age)', async () => {
    const tenMinAgo = Math.floor(Date.now() / 1000) - 600
    const token = await new jose.SignJWT({ request_body_sha256: sha256Hex(rawBody) })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuedAt(tenMinAgo)
      .sign(privateKey)
    await expect(verifyWith(async () => publicJwk)({ header: token, rawBody })).resolves.toBe(false)
  })

  it('rejects a token whose body hash claim does not match the body', async () => {
    const token = await new jose.SignJWT({ request_body_sha256: sha256Hex('a different body') })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuedAt()
      .sign(privateKey)
    await expect(verifyWith(async () => publicJwk)({ header: token, rawBody })).resolves.toBe(false)
  })

  it('rejects a token signed with the wrong algorithm (RS256)', async () => {
    const rsa = await jose.generateKeyPair('RS256')
    const rsaJwk = await jose.exportJWK(rsa.publicKey)
    const token = await new jose.SignJWT({ request_body_sha256: sha256Hex(rawBody) })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuedAt()
      .sign(rsa.privateKey)
    await expect(verifyWith(async () => rsaJwk)({ header: token, rawBody })).resolves.toBe(false)
  })
})
