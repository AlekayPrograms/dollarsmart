# DollarSmart Phase 4: Expense Feed & Budgets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make logged data visible and useful — a filterable expense feed with edit/delete-with-undo, monthly budget targets with calm animated progress bars, a logging-streak badge, and one-tap CSV export.

**Architecture:** Pure aggregation/streak/CSV logic lives in testable modules (`src/lib/budget.js`, `src/lib/streak.js`, `src/lib/csv.js`) with no React or Firebase. The feed and budgets read from the existing `useExpenses` hook (Phase 3). Monthly targets are stored on the user doc (`monthlyTargets`) and household doc (`sharedTargets`) and edited in Settings. Display components (ExpenseCard, ProgressBar, StreakBadge, FilterBar) are small and focused. The feed wires the Phase 3 `UndoToast` into the delete flow: delete optimistically removes from view, and undo restores via `restoreExpense`.

**Tech Stack:** React, existing Firestore hooks, Vitest for pure-logic tests. Reuses categories, expenseStore, useExpenses, UndoToast from Phase 3.

**Execution:** Tasks 1–3 (budget math, streak, CSV) are pure-logic TDD — prime Qwen candidates now that the bridge is fixed. Pre-create empty target files and pass tests as `--read`. Tasks 4–8 (display components, feed wiring, settings) are React/Firebase integration — Claude.

---

## File Structure

```
src/
├── lib/
│   ├── budget.js              # sumByCategory, sumByPool, budgetProgress
│   ├── streak.js              # currentStreak from a list of expense dates
│   └── csv.js                 # expensesToCsv
├── components/
│   ├── ExpenseCard.jsx        # one feed row (amount, category, note, pool badge)
│   ├── ProgressBar.jsx        # calm animated budget bar (green→amber→coral)
│   ├── StreakBadge.jsx        # logging streak display
│   └── FilterBar.jsx          # month / category / pool filters
├── pages/
│   ├── ExpensesPage.jsx       # the feed + filters + delete-with-undo
│   └── SettingsPage.jsx       # monthly targets, CSV export, sign out
├── hooks/
│   └── useMonthlyTargets.js   # read/write personal + shared targets
└── App.jsx                    # add /expenses and /settings routes
tests/
├── budget.test.js
├── streak.test.js
└── csv.test.js
```

---

## Task 1: Budget aggregation math (QWEN — pure logic TDD)

**Files:**
- Create: `src/lib/budget.js`
- Test: `tests/budget.test.js`

- [ ] **Step 1: Write the failing test `tests/budget.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { sumByCategory, sumByPool, budgetProgress } from '../src/lib/budget.js'

const expenses = [
  { amount: 10, categoryId: 'food', poolType: 'personal', type: 'expense' },
  { amount: 5, categoryId: 'food', poolType: 'shared', type: 'expense' },
  { amount: 20, categoryId: 'transport', poolType: 'personal', type: 'expense' },
  { amount: 100, categoryId: 'food', poolType: 'personal', type: 'income' },
]

describe('sumByCategory', () => {
  it('sums expense amounts per category, ignoring income', () => {
    const result = sumByCategory(expenses)
    expect(result.food).toBe(15)
    expect(result.transport).toBe(20)
  })

  it('returns an empty object for no expenses', () => {
    expect(sumByCategory([])).toEqual({})
  })
})

describe('sumByPool', () => {
  it('sums expense amounts per pool, ignoring income', () => {
    const result = sumByPool(expenses)
    expect(result.personal).toBe(30)
    expect(result.shared).toBe(5)
  })
})

describe('budgetProgress', () => {
  it('returns ratio and status "ok" below 80%', () => {
    const p = budgetProgress(50, 100)
    expect(p.ratio).toBe(0.5)
    expect(p.status).toBe('ok')
  })

  it('returns status "warn" at or above 80%', () => {
    expect(budgetProgress(80, 100).status).toBe('warn')
  })

  it('returns status "over" above 100%', () => {
    expect(budgetProgress(120, 100).status).toBe('over')
  })

  it('handles a zero or missing target as no-target', () => {
    expect(budgetProgress(50, 0).status).toBe('none')
    expect(budgetProgress(50, undefined).status).toBe('none')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/budget.test.js`
Expected: FAIL — `budget.js` does not exist.

- [ ] **Step 3: Write `src/lib/budget.js`**

```js
export function sumByCategory(expenses) {
  const out = {}
  for (const e of expenses) {
    if (e.type === 'income') continue
    out[e.categoryId] = (out[e.categoryId] ?? 0) + e.amount
  }
  return out
}

export function sumByPool(expenses) {
  const out = {}
  for (const e of expenses) {
    if (e.type === 'income') continue
    out[e.poolType] = (out[e.poolType] ?? 0) + e.amount
  }
  return out
}

export function budgetProgress(spent, target) {
  if (!target || target <= 0) return { ratio: 0, status: 'none' }
  const ratio = spent / target
  let status = 'ok'
  if (ratio > 1) status = 'over'
  else if (ratio >= 0.8) status = 'warn'
  return { ratio, status }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/budget.test.js`
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/budget.js tests/budget.test.js
git commit -m "feat: add budget aggregation math with tests"
```

---

## Task 2: Logging streak calculation (QWEN — pure logic TDD)

**Files:**
- Create: `src/lib/streak.js`
- Test: `tests/streak.test.js`

- [ ] **Step 1: Write the failing test `tests/streak.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { currentStreak } from '../src/lib/streak.js'

// Helper: build a Date n days before a fixed "today"
const TODAY = new Date('2026-06-12T12:00:00')
function daysAgo(n) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d
}

describe('currentStreak', () => {
  it('returns 0 for no dates', () => {
    expect(currentStreak([], TODAY)).toBe(0)
  })

  it('returns 1 when logged only today', () => {
    expect(currentStreak([daysAgo(0)], TODAY)).toBe(1)
  })

  it('counts consecutive days including today', () => {
    expect(currentStreak([daysAgo(0), daysAgo(1), daysAgo(2)], TODAY)).toBe(3)
  })

  it('still counts a streak that ends yesterday (today not yet logged)', () => {
    expect(currentStreak([daysAgo(1), daysAgo(2)], TODAY)).toBe(2)
  })

  it('breaks the streak when a day is skipped', () => {
    expect(currentStreak([daysAgo(0), daysAgo(1), daysAgo(3)], TODAY)).toBe(2)
  })

  it('returns 0 when the most recent log is older than yesterday', () => {
    expect(currentStreak([daysAgo(3), daysAgo(4)], TODAY)).toBe(0)
  })

  it('dedupes multiple logs on the same day', () => {
    expect(currentStreak([daysAgo(0), daysAgo(0), daysAgo(1)], TODAY)).toBe(2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/streak.test.js`
Expected: FAIL — `streak.js` does not exist.

- [ ] **Step 3: Write `src/lib/streak.js`**

```js
function toDayNumber(date) {
  const d = date instanceof Date ? date : new Date(date)
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000
  )
}

/**
 * Count consecutive days (ending today or yesterday) that have at least one
 * logged entry. A streak ending yesterday still counts so the user isn't
 * punished before they've logged today.
 */
export function currentStreak(dates, today = new Date()) {
  if (!dates || dates.length === 0) return 0

  const days = new Set(dates.map(toDayNumber))
  const todayNum = toDayNumber(today)

  // The streak can anchor at today or yesterday; otherwise it's broken.
  let cursor
  if (days.has(todayNum)) cursor = todayNum
  else if (days.has(todayNum - 1)) cursor = todayNum - 1
  else return 0

  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor -= 1
  }
  return streak
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/streak.test.js`
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/streak.js tests/streak.test.js
git commit -m "feat: add logging streak calculation with tests"
```

---

## Task 3: CSV export generation (QWEN — pure logic TDD)

**Files:**
- Create: `src/lib/csv.js`
- Test: `tests/csv.test.js`

- [ ] **Step 1: Write the failing test `tests/csv.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { expensesToCsv } from '../src/lib/csv.js'

describe('expensesToCsv', () => {
  it('produces a header row even with no expenses', () => {
    const csv = expensesToCsv([])
    expect(csv).toBe('date,type,amount,category,note,pool')
  })

  it('formats a single expense row', () => {
    const csv = expensesToCsv([
      {
        date: new Date('2026-06-12T00:00:00Z'),
        type: 'expense', amount: 24.5, categoryId: 'food',
        note: 'lunch', poolType: 'personal',
      },
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('date,type,amount,category,note,pool')
    expect(lines[1]).toBe('2026-06-12,expense,24.50,food,lunch,personal')
  })

  it('escapes commas and quotes in the note field', () => {
    const csv = expensesToCsv([
      {
        date: new Date('2026-06-12T00:00:00Z'),
        type: 'expense', amount: 5, categoryId: 'other',
        note: 'coffee, "the good kind"', poolType: 'shared',
      },
    ])
    const lines = csv.split('\n')
    expect(lines[1]).toBe('2026-06-12,expense,5.00,other,"coffee, ""the good kind""",shared')
  })

  it('handles a Firestore Timestamp-like date with toDate()', () => {
    const csv = expensesToCsv([
      {
        date: { toDate: () => new Date('2026-01-05T00:00:00Z') },
        type: 'income', amount: 1000, categoryId: 'other',
        note: '', poolType: 'personal',
      },
    ])
    expect(csv.split('\n')[1]).toBe('2026-01-05,income,1000.00,other,,personal')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/csv.test.js`
Expected: FAIL — `csv.js` does not exist.

- [ ] **Step 3: Write `src/lib/csv.js`**

```js
const HEADER = 'date,type,amount,category,note,pool'

function toIsoDate(date) {
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function escapeCsv(value) {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export function expensesToCsv(expenses) {
  const rows = [HEADER]
  for (const e of expenses) {
    rows.push([
      toIsoDate(e.date),
      e.type,
      e.amount.toFixed(2),
      e.categoryId,
      escapeCsv(e.note),
      e.poolType,
    ].join(','))
  }
  return rows.join('\n')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/csv.test.js`
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.js tests/csv.test.js
git commit -m "feat: add CSV export generation with tests"
```

---

## Task 4: Display components — ExpenseCard, ProgressBar, StreakBadge (CLAUDE)

**Files:**
- Create: `src/components/ExpenseCard.jsx`
- Create: `src/components/ProgressBar.jsx`
- Create: `src/components/StreakBadge.jsx`

- [ ] **Step 1: Write `src/components/ProgressBar.jsx`**

```jsx
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
```

- [ ] **Step 2: Write `src/components/StreakBadge.jsx`**

```jsx
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
```

- [ ] **Step 3: Write `src/components/ExpenseCard.jsx`**

```jsx
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

export default function ExpenseCard({ expense, onDelete }) {
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
          {poolLabel} · {formatDate(expense.date)}
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
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExpenseCard.jsx src/components/ProgressBar.jsx src/components/StreakBadge.jsx
git commit -m "feat: add ExpenseCard, ProgressBar, StreakBadge components"
```

---

## Task 5: FilterBar component (CLAUDE)

**Files:**
- Create: `src/components/FilterBar.jsx`

- [ ] **Step 1: Write `src/components/FilterBar.jsx`**

```jsx
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
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterBar.jsx
git commit -m "feat: add FilterBar component"
```

---

## Task 6: ExpensesPage — feed with filters and delete-with-undo (CLAUDE)

**Files:**
- Create: `src/pages/ExpensesPage.jsx`
- Modify: `src/App.jsx` (add /expenses route)

- [ ] **Step 1: Write `src/pages/ExpensesPage.jsx`**

```jsx
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '../hooks/useExpenses.js'
import { deleteExpense, restoreExpense } from '../lib/expenseStore.js'
import ExpenseCard from '../components/ExpenseCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import UndoToast from '../components/UndoToast.jsx'

export default function ExpensesPage() {
  const { expenses, loading } = useExpenses()
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ pool: 'all', category: 'all' })
  const [pendingDelete, setPendingDelete] = useState(null) // the expense being deleted

  const visible = useMemo(() => {
    return expenses.filter((e) => {
      if (pendingDelete && e.id === pendingDelete.id) return false
      if (filters.pool !== 'all' && e.poolType !== filters.pool) return false
      if (filters.category !== 'all' && e.categoryId !== filters.category) return false
      return true
    })
  }, [expenses, filters, pendingDelete])

  const handleDelete = useCallback(async (expense) => {
    setPendingDelete(expense)
    await deleteExpense(expense.id)
  }, [])

  const handleUndo = useCallback(async () => {
    if (pendingDelete) {
      await restoreExpense(pendingDelete)
      setPendingDelete(null)
    }
  }, [pendingDelete])

  const handleExpire = useCallback(() => {
    setPendingDelete(null) // deletion already happened; just clear the toast
  }, [])

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '2rem', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 420, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Expenses</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {loading && <p style={{ color: '#64748B' }}>Loading…</p>}
      {!loading && visible.length === 0 && (
        <p style={{ color: '#64748B' }}>No expenses yet. Tap + Log to add one.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 420 }}>
        {visible.map((e) => (
          <ExpenseCard key={e.id} expense={e} onDelete={handleDelete} />
        ))}
      </div>

      {pendingDelete && (
        <UndoToast
          message="Expense deleted"
          onUndo={handleUndo}
          onExpire={handleExpire}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add the `/expenses` route in `src/App.jsx`**

Add the import:
```jsx
import ExpensesPage from './pages/ExpensesPage.jsx'
```

Add this route before the catch-all `/*`:
```jsx
<Route
  path="/expenses"
  element={
    <AuthGate>
      <HouseholdGate>
        <ExpensesPage />
      </HouseholdGate>
    </AuthGate>
  }
/>
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ExpensesPage.jsx src/App.jsx
git commit -m "feat: add Expenses feed with filters and delete-with-undo"
```

---

## Task 7: Monthly targets hook + SettingsPage (CLAUDE)

**Files:**
- Create: `src/hooks/useMonthlyTargets.js`
- Create: `src/pages/SettingsPage.jsx`
- Modify: `src/App.jsx` (add /settings route)

- [ ] **Step 1: Write `src/hooks/useMonthlyTargets.js`**

```js
import { useCallback } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from './useHousehold.js'

/**
 * Read + write monthly targets. Personal targets live on the user doc;
 * shared targets live on the household doc.
 */
export function useMonthlyTargets() {
  const { user } = useAuth()
  const { household } = useHousehold()

  const personalTargets = household ? undefined : undefined // personal read via user doc below
  const sharedTargets = household?.sharedTargets ?? {}

  const setPersonalTarget = useCallback(async (categoryId, amount) => {
    await setDoc(
      doc(db, 'users', user.uid),
      { monthlyTargets: { [categoryId]: amount } },
      { merge: true },
    )
  }, [user])

  const setSharedTarget = useCallback(async (categoryId, amount) => {
    if (!household) return
    await setDoc(
      doc(db, 'households', household.id),
      { sharedTargets: { [categoryId]: amount } },
      { merge: true },
    )
  }, [household])

  return { sharedTargets, setPersonalTarget, setSharedTarget }
}
```

> **Note:** Personal targets are read directly from the user doc in SettingsPage via a dedicated snapshot to avoid coupling; the hook exposes the writers and shared targets. This keeps the hook focused.

- [ ] **Step 2: Write `src/pages/SettingsPage.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useMonthlyTargets } from '../hooks/useMonthlyTargets.js'
import { CATEGORIES } from '../lib/categories.js'
import { expensesToCsv } from '../lib/csv.js'

export default function SettingsPage() {
  const { user, signOutUser } = useAuth()
  const { expenses } = useExpenses()
  const { setPersonalTarget } = useMonthlyTargets()
  const navigate = useNavigate()
  const [targets, setTargets] = useState({})

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setTargets(snap.exists() ? (snap.data().monthlyTargets ?? {}) : {})
    })
  }, [user])

  function handleExport() {
    const csv = expensesToCsv(expenses)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dollarsmart-expenses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '2rem', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 420, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
      </div>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <h3 style={{ fontSize: '1rem', color: '#CBD5E1' }}>Monthly targets (personal)</h3>
        {CATEGORIES.map((cat) => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ width: 28 }}>{cat.emoji}</span>
            <span style={{ flex: 1, fontSize: '0.9rem' }}>{cat.label}</span>
            <input
              type="number"
              inputMode="decimal"
              defaultValue={targets[cat.id] ?? ''}
              placeholder="—"
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (!Number.isNaN(v)) setPersonalTarget(cat.id, v)
              }}
              style={{
                width: 90, padding: '0.4rem', borderRadius: 8, textAlign: 'right',
                background: '#1E293B', border: '1px solid #334155', color: '#F8FAFC',
              }}
            />
          </div>
        ))}
      </div>

      <button className="btn btn-secondary" style={{ width: '100%', maxWidth: 420 }} onClick={handleExport}>
        Export all expenses as CSV
      </button>

      <button className="btn btn-secondary" style={{ width: '100%', maxWidth: 420 }} onClick={() => signOutUser()}>
        Sign out
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Add the `/settings` route in `src/App.jsx`**

Add the import:
```jsx
import SettingsPage from './pages/SettingsPage.jsx'
```

Add this route before the catch-all `/*`:
```jsx
<Route
  path="/settings"
  element={
    <AuthGate>
      <HouseholdGate>
        <SettingsPage />
      </HouseholdGate>
    </AuthGate>
  }
/>
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMonthlyTargets.js src/pages/SettingsPage.jsx src/App.jsx
git commit -m "feat: add monthly targets and Settings page with CSV export"
```

---

## Task 8: Wire Home dashboard — streak + shared pool progress + nav (CLAUDE)

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Replace `src/pages/HomePage.jsx`**

```jsx
import { Link } from 'react-router-dom'
import { useExpenses } from '../hooks/useExpenses.js'
import { useHousehold } from '../hooks/useHousehold.js'
import { currentStreak } from '../lib/streak.js'
import { sumByPool } from '../lib/budget.js'
import StreakBadge from '../components/StreakBadge.jsx'
import ProgressBar from '../components/ProgressBar.jsx'

export default function HomePage() {
  const { expenses } = useExpenses()
  const { household } = useHousehold()

  const streak = currentStreak(expenses.map((e) => e.date))
  const pools = sumByPool(expenses)
  const sharedSpent = pools.shared ?? 0
  const sharedTarget = Object.values(household?.sharedTargets ?? {}).reduce((a, b) => a + b, 0)

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '2rem', gap: '1.5rem' }}>
      <h1 style={{ margin: 0 }}>💸 DollarSmart</h1>

      <StreakBadge streak={streak} />

      {sharedTarget > 0 && (
        <div style={{ width: '100%', maxWidth: 420 }}>
          <ProgressBar spent={sharedSpent} target={sharedTarget} label="Shared pool this month" />
        </div>
      )}

      <Link to="/log" className="btn btn-primary" style={{ textDecoration: 'none' }}>
        + Log
      </Link>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/expenses" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Expenses
        </Link>
        <Link to="/settings" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Settings
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build compiles and all unit tests pass**

Run: `npm run build`
Expected: build succeeds.

Run: `npm test`
Expected: all unit tests pass (categories, expense, household, budget, streak, csv).

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.jsx
git commit -m "feat: wire Home dashboard with streak and shared pool progress"
```

---

## Phase 4 Done — Definition of Complete

- [ ] `npm test` passes — budget, streak, csv, plus prior suites all green
- [ ] Expense feed lists the user's own expenses, filterable by pool and category
- [ ] Delete shows a 5-second undo toast; undo restores the expense
- [ ] Monthly personal targets editable in Settings, persisted to the user doc
- [ ] Shared pool progress bar on Home (calm green→amber→coral, animated)
- [ ] Logging streak badge on Home (gentle 🌱 restart, no shame)
- [ ] CSV export downloads all the user's expenses
- [ ] Home links to Log, Expenses, Settings

**Next phase:** Phase 5 — Plaid Integration (bank linking, webhook Cloud Function with signature verification, transaction detection). **Requires `firebase login` + real Firebase project first.**
