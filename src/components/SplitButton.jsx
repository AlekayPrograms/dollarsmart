export default function SplitButton({ onSplit, active }) {
  return (
    <button
      onClick={onSplit}
      style={{
        padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
        background: active ? 'var(--accent)' : 'var(--surface)',
        border: '1px solid var(--border)', color: 'var(--text)',
        transition: 'background 0.15s',
      }}
      title="Split this in half with your partner"
    >
      ÷2 Split
    </button>
  )
}
