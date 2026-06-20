import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageWrapper from '../components/PageWrapper.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { monthlyTotals, categoryBreakdown } from '../lib/trends.js'
import { getCategory } from '../lib/categories.js'
import { spring } from '../lib/motion.js'

// 'YYYY-MM' key for a stored date (Firestore Timestamp | Date | string).
function monthKeyOf(date) {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Add `delta` months to a 'YYYY-MM' key.
function shiftKey(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const keyToDate = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1) }

// The N month keys ending at (and including) `anchorKey`, oldest first.
function windowKeys(anchorKey, n = 6) {
  const keys = []
  for (let i = n - 1; i >= 0; i--) keys.push(shiftKey(anchorKey, -i))
  return keys
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmtPct(pct) {
  const val = pct * 100
  return val < 1 ? `${val.toFixed(1)}%` : `${Math.round(val)}%`
}

export default function InsightsPage() {
  const { expenses, loading } = useExpenses()

  const now = new Date()
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // `anchorKey` is the newest (right-edge) month of the 6-bar window; `selectedKey`
  // is the highlighted bar whose breakdown shows below. They start at this month.
  const [anchorKey, setAnchorKey] = useState(currentKey)
  const [selectedKey, setSelectedKey] = useState(currentKey)
  const [picking, setPicking] = useState(false)

  const months = useMemo(
    () => monthlyTotals(expenses, 6, keyToDate(anchorKey)),
    [expenses, anchorKey],
  )
  const maxMonth = Math.max(1, ...months.map((m) => m.total))

  const [selYear, selMonth] = selectedKey.split('-').map(Number)
  const navLabel = `${MONTH_NAMES[selMonth - 1]} ${selYear}`
  const breakdownLabel = MONTH_NAMES[selMonth - 1] + (selYear !== now.getFullYear() ? ` ${selYear}` : '')

  const canGoForward = anchorKey < currentKey

  // Move the window one month, keeping the selection in view (snap it to the
  // new right edge when it falls outside the shifted window).
  function step(delta) {
    let a = shiftKey(anchorKey, delta)
    if (a > currentKey) a = currentKey
    setAnchorKey(a)
    if (!windowKeys(a).includes(selectedKey)) setSelectedKey(a)
  }

  // Jump anywhere via the native month picker (can't go past the current month).
  function jumpTo(key) {
    setPicking(false)
    if (!key) return
    const k = key > currentKey ? currentKey : key
    setAnchorKey(k)
    setSelectedKey(k)
  }

  const selectedExpenses = useMemo(
    () => expenses.filter((e) => monthKeyOf(e.date) === selectedKey),
    [expenses, selectedKey],
  )
  const breakdown = useMemo(() => categoryBreakdown(selectedExpenses), [selectedExpenses])
  const monthTotal = breakdown.reduce((a, b) => a + b.total, 0)

  // Savings rate = (income − expenses) / income, for the selected month.
  const monthIncome = useMemo(
    () => selectedExpenses.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    [selectedExpenses],
  )
  const savingsRate = monthIncome > 0 ? Math.round(((monthIncome - monthTotal) / monthIncome) * 100) : null

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

  const navBtn = {
    width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
    fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1,
  }

  return (
    <PageWrapper className="page-center" style={{ justifyContent: 'flex-start', gap: '1.25rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Insights</h2>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--subtle)' }}>
          Your own spending (your half of any split).
        </p>
      </div>

      {loading && <p style={{ color: 'var(--subtle)', fontSize: '0.875rem' }}>Loading…</p>}

      {/* Monthly spending bar chart with month navigator */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <button onClick={() => step(-1)} style={navBtn} aria-label="Previous month">‹</button>

          {picking ? (
            <input
              type="month"
              autoFocus
              defaultValue={selectedKey}
              max={currentKey}
              onChange={(e) => jumpTo(e.target.value)}
              onBlur={() => setPicking(false)}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)',
                borderRadius: 10, padding: '0.4rem 0.6rem', fontSize: '0.95rem', colorScheme: 'dark', outline: 'none',
              }}
            />
          ) : (
            <button
              onClick={() => setPicking(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {navLabel}
              <span style={{ fontSize: '0.7rem', color: 'var(--subtle)' }}>▾</span>
            </button>
          )}

          <button
            onClick={() => canGoForward && step(1)}
            disabled={!canGoForward}
            style={{ ...navBtn, opacity: canGoForward ? 1 : 0.35, cursor: canGoForward ? 'pointer' : 'default' }}
            aria-label="Next month"
          >›</button>
        </div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50 || info.velocity.x < -300) {
              if (canGoForward) step(1)
            } else if (info.offset.x > 50 || info.velocity.x > 300) {
              step(-1)
            }
          }}
          style={{ touchAction: 'pan-y' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 140 }}>
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
                  <div style={{
                    width: '100%', maxWidth: 34, borderRadius: '6px 6px 2px 2px',
                    height: `${Math.max(h, m.total > 0 ? 4 : 1)}%`,
                    background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
                  }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--text)' : 'var(--muted)' }}>
                    {m.label}
                  </span>
                </button>
              )
            })}
          </div>
          <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--subtle)', margin: '0.4rem 0 0', userSelect: 'none' }}>
            ← swipe to change month →
          </p>
        </motion.div>
      </div>

      {/* Selected month's category breakdown */}
      <div className="card">
        <p className="section-label">{breakdownLabel} by category</p>

        {monthIncome > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--muted)' }}>
              Saved {savingsRate}% of ${monthIncome.toFixed(0)} income
            </span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: savingsRate >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
              {savingsRate >= 0 ? '+' : ''}${(monthIncome - monthTotal).toFixed(0)}
            </span>
          </div>
        )}

        {breakdown.length === 0 ? (
          <p style={{ color: 'var(--subtle)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
            No spending logged in {breakdownLabel}.
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
                      <span style={{ color: 'var(--subtle)', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(b.pct)}</span>
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
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(b.pct * 100)}%` }}
                        transition={spring.gentle}
                        style={{ height: '100%', background: cat.color, borderRadius: 3 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  )
}
