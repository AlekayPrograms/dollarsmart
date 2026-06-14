import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase/client.js'

const functions = getFunctions(app)

export const createLinkToken = httpsCallable(functions, 'createLinkToken')
export const exchangePublicToken = httpsCallable(functions, 'exchangePublicToken')
