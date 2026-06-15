export default function TypeToggle({ type, onChange }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
      {['expense', 'income'].map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '0.4rem 1.1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 600, textTransform: 'capitalize',
            background: type === t ? (t === 'income' ? 'var(--accent)' : 'var(--surface-2)') : 'transparent',
            color: 'var(--text)',
            transition: 'background 0.15s',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
