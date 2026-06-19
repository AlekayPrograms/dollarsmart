// src/components/ui/EmptyState.jsx
export default function EmptyState({ icon, heading, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--subtle)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--muted)' }}>
        {heading}
      </p>
      {sub && (
        <p style={{ margin: '0.35rem 0 0', fontSize: 'var(--text-sm)' }}>{sub}</p>
      )}
    </div>
  )
}
