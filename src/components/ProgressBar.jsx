import { budgetProgress } from '../lib/budget.js'

const STATUS_COLOR = {
  ok: '#10B981',
  warn: '#F59E0B',
  over: '#F87171',
  none: '#334155',
}

export default function ProgressBar({ spent, target, label }) {
  const { ratio, status } = budgetProgress(spent, target)
  const pct = Math.min(100, Math.round(ratio * 100))
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
          <span style={{ color: '#CBD5E1' }}>{label}</span>
          <span style={{ color: '#64748B' }}>
            ${spent.toFixed(2)}{target > 0 ? ` / $${target.toFixed(2)}` : ''}
          </span>
        </div>
      )}
      <div style={{ height: 8, background: '#1E293B', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: STATUS_COLOR[status],
          borderRadius: 999, transition: 'width 0.4s ease-out, background 0.4s ease-out',
        }} />
      </div>
    </div>
  )
}
