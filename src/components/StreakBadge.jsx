export default function StreakBadge({ streak }) {
  if (streak <= 0) {
    return (
      <div style={badgeStyle}>
        <span>🌱</span>
        <span style={{ fontSize: '0.8rem' }}>Start a streak today</span>
      </div>
    )
  }
  return (
    <div style={badgeStyle}>
      <span>🔥</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
        {streak} day{streak === 1 ? '' : 's'}
      </span>
    </div>
  )
}

const badgeStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
  background: '#1E293B', borderRadius: 999, padding: '0.4rem 0.9rem',
  color: '#F8FAFC',
}
