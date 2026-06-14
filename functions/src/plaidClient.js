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
