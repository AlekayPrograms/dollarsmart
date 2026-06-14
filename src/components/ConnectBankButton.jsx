import { usePlaidConnect } from '../hooks/usePlaidConnect.js'

export default function ConnectBankButton({ label = 'Connect bank account' }) {
  const { start, loading, error } = usePlaidConnect()
  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <button
        className="btn btn-secondary"
        style={{ width: '100%' }}
        onClick={start}
        disabled={loading}
      >
        {loading ? 'Connecting…' : label}
      </button>
      {error && <p style={{ color: '#F87171', fontSize: '0.8rem', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
