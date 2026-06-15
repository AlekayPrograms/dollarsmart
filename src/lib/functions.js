import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase/client.js'

const functions = getFunctions(app)

export const createLinkToken = httpsCallable(functions, 'createLinkToken')
export const exchangePublicToken = httpsCallable(functions, 'exchangePublicToken')
export const getAccounts = httpsCallable(functions, 'getAccounts')
export const disconnectBank = httpsCallable(functions, 'disconnectBank')
export const kickMember = httpsCallable(functions, 'kickMember')
