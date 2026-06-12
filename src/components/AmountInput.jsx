export default function AmountInput({ value, onChange, autoFocus = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
      <span style={{ fontSize: '2.5rem', color: '#64748B' }}>$</span>
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
          color: '#F8FAFC', outline: 'none',
        }}
      />
    </div>
  )
}
