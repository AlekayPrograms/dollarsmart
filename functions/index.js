const admin = require('firebase-admin')
admin.initializeApp()

const { createLinkToken } = require('./src/handlers/createLinkToken')
const { exchangePublicToken } = require('./src/handlers/exchangePublicToken')
const { plaidWebhook } = require('./src/handlers/plaidWebhook')
const { expenseTrigger } = require('./src/handlers/expenseTrigger')
const { expenseRemovalVotes } = require('./src/handlers/expenseRemovalVotes')
const { scheduledNudge } = require('./src/handlers/scheduledNudge')
const { weeklyInsight } = require('./src/handlers/weeklyInsight')
const { monthlyRecap } = require('./src/handlers/monthlyRecap')
const { getAccounts, disconnectBank } = require('./src/handlers/plaidAccount')
const { kickMember } = require('./src/handlers/kickMember')
const { announceUpdate } = require('./src/handlers/announceUpdate')

module.exports = {
  createLinkToken, exchangePublicToken, plaidWebhook, expenseTrigger, expenseRemovalVotes,
  scheduledNudge, weeklyInsight, monthlyRecap, getAccounts, disconnectBank, kickMember,
  announceUpdate,
}
