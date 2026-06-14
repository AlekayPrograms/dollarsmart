const admin = require('firebase-admin')
admin.initializeApp()

const { createLinkToken } = require('./src/handlers/createLinkToken')
const { exchangePublicToken } = require('./src/handlers/exchangePublicToken')
const { plaidWebhook } = require('./src/handlers/plaidWebhook')

module.exports = { createLinkToken, exchangePublicToken, plaidWebhook }
