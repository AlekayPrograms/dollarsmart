import { useMemo, useState } from 'react'
import { useExpenses } from '../hooks/useExpenses.js'
import { monthlyTotals, categoryBreakdown } from '../lib/trends.js'
import { getCategory } from '../lib/categories.js'

// 'YYYY-MM' key for a stored date (Firestore Timestamp | Date | string).
function monthKeyOf(date) {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function InsightsPage() {
  const { expenses, loading } = useExpenses()

  const months = useMemo(() => monthlyTotals(expenses, 6), [expenses])
  const maxMonth = Math.max(1, ...months.map((m) => m.total))

  const now = new Date()
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedKey, setSelectedKey] = useState(currentKey)

  // Label the breakdown for the selected month (add the year if it isn't this one).
  const [selYear, selMonth] = selectedKey.split('-').map(Number)
  const selectedLabel = MONTH_NAMES[selMonth - 1] + (selYear !== now.getFullYear() ? ` ${selYear}` : '')

  const selectedExpenses = useMemo(
    () => expenses.filter((e) => monthKeyOf(e.date) === selectedKey),
    [expenses, selectedKey],
  )
  const breakdown = useMemo(() => categoryBreakdown(selectedExpenses), [selectedExpenses])
  const monthTotal = breakdown.reduce((a, b) => a + b.total, 0)

  // Build a conic-gradient ring from the category shares.
  const donut = useMemo(() => {
    let acc = 0
    const stops = breakdown.map((b) => {
      const start = acc * 360
      acc += b.pct
      const end = acc * 360
      return `${getCategory(b.categoryId).color} ${start}deg ${end}deg`
    })
    return stops.length ? `conic-gradient(${stops.join(', ')})` : 'var(--surface-2)'
  }, [breakdown])

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', gap: '1.25rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Insights</h2>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--subtle)' }}>
          Your spending only — shared totals live on Home.
        </p>
      </div>

      {loading && <p style={{ color: 'var(--subtle)', fontSize: '0.875rem' }}>Loading…</p>}

      {/* Monthly spending bar chart — tap a month to see its breakdown below */}
      <div className="card">
        <p className="section-label">Spending — last 6 months</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 140, paddingTop: '0.5rem' }}>
          {months.map((m) => {
            const h = Math.round((m.total / maxMonth) * 100)
            const isSelected = m.key === selectedKey
            return (
              <button
                key={m.key}
                onClick={() => setSelectedKey(m.key)}
                aria-pressed={isSelected}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                  height: '100%', justifyContent: 'flex-end', background: 'none', border: 'none',
                  padding: 0, cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '0.62rem', color: 'var(--subtle)', fontVariantNumeric: 'tabular-nums' }}>
                  {m.total > 0 ? `$${m.total.toFixed(0)}` : ''}
                </span>
                <div
                  style={{
                    width: '100%', maxWidth: 34, borderRadius: '6px 6px 2px 2px',
                    height: `${Math.max(h, m.total > 0 ? 4 : 1)}%`,
                    background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
                    transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1), background 0.15s',
                  }}
                />
                <span style={{ fontSize: '0.65rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--text)' : 'var(--muted)' }}>
                  {m.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected month's category breakdown */}
      <div className="card">
        <p className="section-label">{selectedLabel} by category</p>

        {breakdown.length === 0 ? (
          <p style={{ color: 'var(--subtle)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
            No spending logged in {selectedLabel}.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', margin: '0.25rem 0 1rem' }}>
              <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: donut }} />
                <div style={{
                  position: 'absolute', inset: 14, borderRadius: '50%', background: 'var(--surface)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--subtle)' }}>Total</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ${monthTotal.toFixed(0)}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {breakdown.slice(0, 4).map((b) => {
                  const cat = getCategory(b.categoryId)
                  return (
                    <div key={b.categoryId} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.label}</span>
                      <span style={{ color: 'var(--subtle)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(b.pct * 100)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {breakdown.map((b) => {
                const cat = getCategory(b.categoryId)
                return (
                  <div key={b.categoryId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{cat.emoji}</span>
                        <span style={{ color: 'var(--muted)' }}>{cat.label}</span>
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--subtle)', fontVariantNumeric: 'tabular-nums' }}>
                        ${b.total.toFixed(0)}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(b.pct * 100)}%`, background: cat.color, borderRadius: 3, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
