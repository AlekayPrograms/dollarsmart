import { useState, useEffect } from 'react'

/**
 * Surfaces app installation in-app. Chrome/Android fires `beforeinstallprompt`
 * when the PWA is installable; we capture it and show a button that triggers
 * the native install dialog. Renders nothing if already installed or if the
 * browser hasn't offered installation (e.g. iOS Safari — use the Add to Home
 * Screen guide there instead).
 */
export default function InstallAppButton() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault()
      setDeferred(e)
    }
    function onInstalled() {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const standalone =
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
    (typeof navigator !== 'undefined' && navigator.standalone)

  if (standalone || installed || !deferred) return null

  async function install() {
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return (
    <button className="btn btn-primary" style={{ width: '100%', maxWidth: 420 }} onClick={install}>
      📲 Install DollarSmart as an app
    </button>
  )
}
