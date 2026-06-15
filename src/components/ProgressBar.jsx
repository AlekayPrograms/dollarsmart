import { budgetProgress } from '../lib/budget.js'

const TRACK = 'rgba(255,255,255,0.06)'
const FILL = {
  ok: '#10B981',
  warn: '#F59E0B',
  over: '#F87171',
  none: '#334155',
}

export default function ProgressBar({ spent, target, label, color }) {
  const { ratio, status } = budgetProgress(spent, target)
  const pct = Math.min(100, Math.round(ratio * 100))
  const fill = color || FILL[status]

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>{label}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--subtle)', fontVariantNumeric: 'tabular-nums' }}>
            ${spent.toFixed(0)}{target > 0 ? ` / $${target.toFixed(0)}` : ''}
          </span>
        </div>
      )}
      <div style={{ height: 5, background: TRACK, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: fill,
          borderRadius: 999,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}
