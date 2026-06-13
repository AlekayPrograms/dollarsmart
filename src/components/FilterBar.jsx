import { CATEGORIES } from '../lib/categories.js'

const POOLS = [
  { id: 'all', label: 'All' },
  { id: 'personal', label: 'Personal' },
  { id: 'shared', label: 'Shared' },
  { id: 'split', label: 'Split' },
]

const selectStyle = {
  background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155',
  borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.85rem',
}

export default function FilterBar({ filters, onChange }) {
  function update(key, value) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: 420, flexWrap: 'wrap' }}>
      <select style={selectStyle} value={filters.pool} onChange={(e) => update('pool', e.target.value)}>
        {POOLS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <select style={selectStyle} value={filters.category} onChange={(e) => update('category', e.target.value)}>
        <option value="all">All categories</option>
        {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </div>
  )
}
