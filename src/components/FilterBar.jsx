import { CATEGORIES } from '../lib/categories.js'

const POOLS = [
  { id: 'all', label: 'All' },
  { id: 'personal', label: 'Personal' },
  { id: 'shared', label: 'Shared' },
  { id: 'split', label: 'Split' },
]

const PERIODS = [
  { id: 'all', label: 'All time' },
  { id: 'year', label: 'Year' },
  { id: 'month', label: 'Month' },
  { id: 'day', label: 'Day' },
]

const ctrl = {
  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.85rem', colorScheme: 'dark',
}

export default function FilterBar({ filters, onChange, years }) {
  function update(key, value) {
    onChange({ ...filters, [key]: value })
  }

  function setMode(mode) {
    // Seed a sensible default value so the filter applies immediately.
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const value =
      mode === 'year' ? String(y) :
      mode === 'month' ? `${y}-${m}` :
      mode === 'day' ? `${y}-${m}-${d}` : ''
    onChange({ ...filters, period: { mode, value } })
  }

  function setValue(value) {
    onChange({ ...filters, period: { ...filters.period, value } })
  }

  const period = filters.period ?? { mode: 'all', value: '' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 440 }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <select style={ctrl} value={filters.pool} onChange={(e) => update('pool', e.target.value)}>
          {POOLS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select style={ctrl} value={filters.category} onChange={(e) => update('category', e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={ctrl} value={period.mode} onChange={(e) => setMode(e.target.value)}>
          {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>

        {period.mode === 'year' && (
          <select style={ctrl} value={period.value} onChange={(e) => setValue(e.target.value)}>
            {(years ?? []).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {period.mode === 'month' && (
          <input type="month" style={ctrl} value={period.value} onChange={(e) => setValue(e.target.value)} />
        )}
        {period.mode === 'day' && (
          <input type="date" style={ctrl} value={period.value} onChange={(e) => setValue(e.target.value)} />
        )}
      </div>
    </div>
  )
}
