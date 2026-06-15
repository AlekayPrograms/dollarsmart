const admin = require('firebase-admin')
admin.initializeApp()

const { createLinkToken } = require('./src/handlers/createLinkToken')
const { exchangePublicToken } = require('./src/handlers/exchangePublicToken')
const { plaidWebhook } = require('./src/handlers/plaidWebhook')
const { expenseTrigger } = require('./src/handlers/expenseTrigger')
const { expenseRemovalVotes } = require('./src/handlers/expenseRemovalVotes')
const { scheduledNudge } = require('./src/handlers/scheduledNudge')
const { weeklyInsight } = require('./src/handlers/weeklyInsight')
const { getAccounts, disconnectBank } = require('./src/handlers/plaidAccount')
const { kickMember } = require('./src/handlers/kickMember')

module.exports = {
  createLinkToken, exchangePublicToken, plaidWebhook, expenseTrigger, expenseRemovalVotes,
  scheduledNudge, weeklyInsight, getAccounts, disconnectBank, kickMember,
}
