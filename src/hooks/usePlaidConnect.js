import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { createLinkToken, exchangePublicToken } from '../lib/functions.js'

/**
 * Orchestrates the Plaid Link flow:
 *  1. fetch a link token from our callable
 *  2. open Plaid Link once it's ready
 *  3. on success, exchange the public token via our callable
 * Returns { start, loading, error } for a button to use.
 */
export function usePlaidConnect() {
  const [linkToken, setLinkToken] = useState(null)
  const [pendingOpen, setPendingOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onSuccess = useCallback(async (publicToken) => {
    setLoading(true)
    try {
      await exchangePublicToken({ publicToken })
    } catch (e) {
      setError('Could not finish connecting your bank.')
    } finally {
      setLoading(false)
    }
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  })

  const start = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await createLinkToken()
      setLinkToken(res.data.linkToken)
      setPendingOpen(true)
    } catch (e) {
      setError('Could not start bank connection.')
      setLoading(false)
    }
  }, [])

  // Open Link once we have a token AND the SDK reports ready. Done in an
  // effect (not during render) to avoid side effects in the render path.
  useEffect(() => {
    if (pendingOpen && linkToken && ready) {
      setPendingOpen(false)
      setLoading(false)
      open()
    }
  }, [pendingOpen, linkToken, ready, open])

  return { start, loading, error }
}
