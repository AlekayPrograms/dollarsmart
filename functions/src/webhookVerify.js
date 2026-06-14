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

function safeDecodeKid(token) {
  try {
    return jose.decodeProtectedHeader(token).kid
  } catch {
    return null
  }
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
      const kid = safeDecodeKid(header)
      const jwk = await getKey(kid)
      const { payload } = await verifyJwt(header, jwk)
      if (!payload || !payload.request_body_sha256) return false
      return bodyMatchesHash(rawBody, payload.request_body_sha256)
    } catch {
      return false
    }
  }
}

module.exports = { sha256Hex, bodyMatchesHash, makeVerifyWebhook, safeDecodeKid }
