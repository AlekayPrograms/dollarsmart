const admin = require('firebase-admin')
admin.initializeApp()

const { createLinkToken } = require('./src/handlers/createLinkToken')
const { exchangePublicToken } = require('./src/handlers/exchangePublicToken')
const { plaidWebhook } = require('./src/handlers/plaidWebhook')
const { expenseTrigger } = require('./src/handlers/expenseTrigger')
const { scheduledNudge } = require('./src/handlers/scheduledNudge')
const { weeklyInsight } = require('./src/handlers/weeklyInsight')

module.exports = { createLinkToken, exchangePublicToken, plaidWebhook, expenseTrigger, scheduledNudge, weeklyInsight }
