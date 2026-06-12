export default function SplitButton({ onSplit, active }) {
  return (
    <button
      onClick={onSplit}
      style={{
        padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
        background: active ? '#10B981' : '#1E293B',
        border: '1px solid #334155', color: '#F8FAFC',
      }}
      title="Split this in half and route to the shared pool"
    >
      ÷2 Split
    </button>
  )
}
