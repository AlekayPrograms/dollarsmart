import { getCategory } from '../lib/categories.js'

const POOL_LABEL = {
  personal: 'Personal',
  shared: 'Shared',
  split: 'Split',
}

function formatDate(date) {
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ExpenseCard({ expense, onDelete, byPartner = false }) {
  const cat = getCategory(expense.categoryId)
  const isIncome = expense.type === 'income'
  const poolLabel = isIncome ? 'Income' : POOL_LABEL[expense.poolType]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      background: '#1E293B', borderRadius: 12, padding: '0.75rem 1rem', width: '100%',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: cat.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
        flexShrink: 0,
      }}>
        {cat.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{cat.label}</div>
        {expense.note && (
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {expense.note}
          </div>
        )}
        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
          {poolLabel} · {formatDate(expense.date)}{byPartner ? ' · Partner' : ''}
        </div>
      </div>
      <div style={{
        fontWeight: 700, fontSize: '1.1rem',
        color: isIncome ? '#10B981' : '#F8FAFC',
      }}>
        {isIncome ? '+' : '−'}${expense.amount.toFixed(2)}
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(expense)}
          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '1.1rem' }}
          title="Delete"
        >
          ×
        </button>
      )}
    </div>
  )
}
