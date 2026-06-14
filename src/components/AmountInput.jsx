export default function AmountInput({ value, onChange, autoFocus = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
      background: '#1E293B', border: '1px solid #334155', borderRadius: 16,
      padding: '0.5rem 1.25rem', maxWidth: 320, width: '100%', boxSizing: 'border-box',
    }}>
      <span style={{ fontSize: '2.5rem', color: '#94A3B8' }}>$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder="0.00"
        style={{
          fontSize: '3rem', fontWeight: 700, width: '60%', maxWidth: 240,
          textAlign: 'center', background: 'transparent', border: 'none',
          color: '#FFFFFF', outline: 'none',
        }}
      />
    </div>
  )
}
