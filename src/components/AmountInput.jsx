export default function AmountInput({ value, onChange, autoFocus = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
      padding: '0.5rem 1.25rem', maxWidth: 320, width: '100%',
    }}>
      <span style={{ fontSize: '1.75rem', color: 'var(--subtle)' }}>$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder="0.00"
        style={{
          fontSize: '2.25rem', fontWeight: 700, width: '60%', maxWidth: 240,
          textAlign: 'center', background: 'transparent', border: 'none',
          color: 'var(--text)', outline: 'none',
        }}
      />
    </div>
  )
}
