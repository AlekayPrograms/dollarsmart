export default function TypeToggle({ type, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', background: '#1E293B', borderRadius: 10, padding: 4,
    }}>
      {['expense', 'income'].map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '0.4rem 1.1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 600, textTransform: 'capitalize',
            background: type === t ? (t === 'income' ? '#10B981' : '#334155') : 'transparent',
            color: '#F8FAFC',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
