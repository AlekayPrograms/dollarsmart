# DollarSmart Phase 3: Core Logging — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the heart of the app — log an expense or income in under 20 seconds via Quick Log (amount → category → save), with a ÷2 split button, an expense/income toggle, a Full Log mode for details, and Firestore persistence that works offline with an undo-on-delete safety net.

**Architecture:** Categories are defined as static data (`src/lib/categories.js`). Pure money/split math lives in `src/lib/expense.js` (testable without Firebase). Firestore writes go through `src/lib/expenseStore.js`, which wraps the existing `db` client and enables IndexedDB offline persistence. A `useExpenses` hook streams the current user's expenses in real time. The Log screen is composed of small focused components (AmountInput, CategoryGrid, TypeToggle, SplitButton) so each is independently testable and reusable. Offline support uses Firestore's built-in `enableIndexedDbPersistence` — writes queue locally and sync on reconnect, satisfying the spec's offline requirement without custom queue code.

**Tech Stack:** React, Firestore (with IndexedDB persistence), Vitest for pure-logic unit tests. Reuses AuthContext + useHousehold from Phase 2.

**Execution:** Tasks that MODIFY existing files or add pure logic with tests are Qwen-friendly (Qwen handles edits to existing files well). New-component creation stays with Claude given Phase 2's lesson about aider + new files. Specifically: Tasks 1–2 (categories data, expense math + tests) → Qwen-eligible. Tasks 3–7 (store, hook, components, screen wiring) → Claude.

---

## File Structure

```
src/
├── lib/
│   ├── categories.js          # static category list (id, label, emoji, color)
│   ├── expense.js             # pure math: splitAmount, normalizeAmount, validateAmount
│   └── expenseStore.js        # Firestore CRUD + IndexedDB persistence enable
├── hooks/
│   └── useExpenses.js         # real-time stream of current user's expenses
├── components/
│   ├── AmountInput.jsx        # large numeric input with normalization
│   ├── CategoryGrid.jsx       # tappable category tiles
│   ├── TypeToggle.jsx         # expense / income switch
│   ├── SplitButton.jsx        # ÷2 button
│   └── UndoToast.jsx          # 5-second undo toast
├── pages/
│   └── LogPage.jsx            # Quick Log + Full Log screen (replaces nothing — new route)
├── App.jsx                    # add /log route
└── firebase/
    └── client.js              # enable IndexedDB persistence
tests/
├── expense.test.js            # unit tests for split/normalize/validate
└── categories.test.js         # category data integrity
```

---

## Task 1: Category data (MODIFY-friendly — Qwen eligible)

**Files:**
- Create: `src/lib/categories.js`
- Test: `tests/categories.test.js`

- [ ] **Step 1: Write the failing test `tests/categories.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { CATEGORIES, getCategory } from '../src/lib/categories.js'

describe('CATEGORIES', () => {
  it('has 10 categories', () => {
    expect(CATEGORIES).toHaveLength(10)
  })

  it('every category has id, label, emoji, color', () => {
    for (const cat of CATEGORIES) {
      expect(cat.id).toBeTruthy()
      expect(cat.label).toBeTruthy()
      expect(cat.emoji).toBeTruthy()
      expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('has unique ids', () => {
    const ids = CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes a pets category for Hachi', () => {
    expect(CATEGORIES.find((c) => c.id === 'pets')).toBeTruthy()
  })
})

describe('getCategory', () => {
  it('returns the category for a known id', () => {
    expect(getCategory('food').label).toBe('Food & Drink')
  })

  it('returns the "other" category for an unknown id', () => {
    expect(getCategory('nonexistent').id).toBe('other')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/categories.test.js`
Expected: FAIL — `categories.js` does not exist.

- [ ] **Step 3: Write `src/lib/categories.js`**

```js
export const CATEGORIES = [
  { id: 'food', label: 'Food & Drink', emoji: '🍔', color: '#F97316' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒', color: '#22C55E' },
  { id: 'transport', label: 'Transport', emoji: '🚗', color: '#3B82F6' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#A855F7' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎮', color: '#EC4899' },
  { id: 'bills', label: 'Bills & Utilities', emoji: '💡', color: '#EAB308' },
  { id: 'health', label: 'Health', emoji: '💊', color: '#14B8A6' },
  { id: 'travel', label: 'Travel', emoji: '✈️', color: '#0EA5E9' },
  { id: 'pets', label: 'Pets', emoji: '🐾', color: '#A16207' },
  { id: 'other', label: 'Other', emoji: '📦', color: '#6B7280' },
]

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES.find((c) => c.id === 'other')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/categories.test.js`
Expected: PASS — all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/categories.js tests/categories.test.js
git commit -m "feat: add category data with lookup and tests"
```

---

## Task 2: Pure expense math (MODIFY-friendly — Qwen eligible)

**Files:**
- Create: `src/lib/expense.js`
- Test: `tests/expense.test.js`

- [ ] **Step 1: Write the failing test `tests/expense.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { normalizeAmount, validateAmount, splitInHalf } from '../src/lib/expense.js'

describe('normalizeAmount', () => {
  it('parses a plain number string', () => {
    expect(normalizeAmount('24.50')).toBe(24.5)
  })

  it('strips currency symbols and spaces', () => {
    expect(normalizeAmount('$ 24.50')).toBe(24.5)
  })

  it('handles comma as decimal separator', () => {
    expect(normalizeAmount('24,50')).toBe(24.5)
  })

  it('returns NaN for non-numeric input', () => {
    expect(normalizeAmount('abc')).toBeNaN()
  })

  it('rounds to 2 decimal places', () => {
    expect(normalizeAmount('24.999')).toBe(25)
    expect(normalizeAmount('24.005')).toBe(24.01)
  })
})

describe('validateAmount', () => {
  it('accepts a positive number', () => {
    expect(validateAmount(24.5)).toBe(true)
  })

  it('rejects zero', () => {
    expect(validateAmount(0)).toBe(false)
  })

  it('rejects negative numbers', () => {
    expect(validateAmount(-5)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(validateAmount(NaN)).toBe(false)
  })
})

describe('splitInHalf', () => {
  it('halves an even amount', () => {
    expect(splitInHalf(24.5)).toBe(12.25)
  })

  it('rounds the half to 2 decimals', () => {
    expect(splitInHalf(24.51)).toBe(12.26) // 12.255 rounds up
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/expense.test.js`
Expected: FAIL — `expense.js` does not exist.

- [ ] **Step 3: Write `src/lib/expense.js`**

```js
export function normalizeAmount(input) {
  if (typeof input === 'number') return roundCents(input)
  if (typeof input !== 'string') return NaN
  // Strip everything except digits, comma, period, minus
  let cleaned = input.replace(/[^0-9.,-]/g, '').trim()
  // If there's a comma but no period, treat comma as decimal separator
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.')
  } else {
    // Otherwise commas are thousands separators — remove them
    cleaned = cleaned.replace(/,/g, '')
  }
  const value = parseFloat(cleaned)
  if (Number.isNaN(value)) return NaN
  return roundCents(value)
}

export function validateAmount(amount) {
  return typeof amount === 'number' && !Number.isNaN(amount) && amount > 0
}

export function splitInHalf(amount) {
  return roundCents(amount / 2)
}

function roundCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/expense.test.js`
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/expense.js tests/expense.test.js
git commit -m "feat: add pure expense math (normalize, validate, split) with tests"
```

---

## Task 3: Firestore expense store + offline persistence (CLAUDE)

**Files:**
- Create: `src/lib/expenseStore.js`
- Modify: `src/firebase/client.js`

- [ ] **Step 1: Enable IndexedDB persistence in `src/firebase/client.js`**

Replace the file with this version (adds persistence; keeps existing exports and emulator wiring):
```js
import { initializeApp } from 'firebase/app'
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)

// initializeFirestore with persistent cache = offline support out of the box.
// Writes queue in IndexedDB and sync on reconnect.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
})

export const auth = getAuth(app)

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080)
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
}
```

- [ ] **Step 2: Write `src/lib/expenseStore.js`**

```js
import {
  collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/client.js'

/**
 * Add an expense or income entry.
 * @param {object} params
 * @param {string} params.uid - the logging user
 * @param {string} params.householdId
 * @param {number} params.amount
 * @param {string} params.categoryId
 * @param {'expense'|'income'} params.type
 * @param {'personal'|'shared'|'split'} params.poolType
 * @param {string} [params.note]
 * @param {Date} [params.date]
 * @param {number} [params.splitRatio]
 * @returns {Promise<string>} the new doc id
 */
export async function addExpense({
  uid, householdId, amount, categoryId, type, poolType,
  note = '', date = new Date(), splitRatio = 0.5,
}) {
  const ref = await addDoc(collection(db, 'expenses'), {
    uid,
    householdId,
    amount,
    categoryId,
    type,
    poolType,
    note,
    date,
    splitRatio: poolType === 'split' ? splitRatio : null,
    reactions: {},
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteExpense(expenseId) {
  await deleteDoc(doc(db, 'expenses', expenseId))
}

export async function updateExpense(expenseId, updates) {
  await updateDoc(doc(db, 'expenses', expenseId), updates)
}

/**
 * Re-create an expense from a snapshot of its data (used by undo).
 * Returns the new id (the restored doc gets a fresh id).
 */
export async function restoreExpense(data) {
  const { id, createdAt, ...rest } = data
  const ref = await addDoc(collection(db, 'expenses'), {
    ...rest,
    createdAt: serverTimestamp(),
  })
  return ref.id
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds, `dist/sw.js` generated.

- [ ] **Step 4: Commit**

```bash
git add src/lib/expenseStore.js src/firebase/client.js
git commit -m "feat: add expense store with Firestore offline persistence"
```

---

## Task 4: useExpenses hook (CLAUDE)

**Files:**
- Create: `src/hooks/useExpenses.js`

- [ ] **Step 1: Write `src/hooks/useExpenses.js`**

```js
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

/**
 * Streams the current user's expenses in real time, most recent first.
 * Per the spec privacy model, a user only ever sees their own expenses.
 */
export function useExpenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setExpenses([]); setLoading(false); return }
    const q = query(
      collection(db, 'expenses'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
    )
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  return { expenses, loading }
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExpenses.js
git commit -m "feat: add useExpenses real-time hook"
```

---

## Task 5: Log input components (CLAUDE)

**Files:**
- Create: `src/components/AmountInput.jsx`
- Create: `src/components/CategoryGrid.jsx`
- Create: `src/components/TypeToggle.jsx`
- Create: `src/components/SplitButton.jsx`

- [ ] **Step 1: Write `src/components/AmountInput.jsx`**

```jsx
export default function AmountInput({ value, onChange, autoFocus = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
      <span style={{ fontSize: '2.5rem', color: '#64748B' }}>$</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder="0.00"
        style={{
          fontSize: '3rem', fontWeight: 700, width: '60%', maxWidth: 240,
          textAlign: 'center', background: 'transparent', border: 'none',
          color: '#F8FAFC', outline: 'none',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/CategoryGrid.jsx`**

```jsx
import { CATEGORIES } from '../lib/categories.js'

export default function CategoryGrid({ selected, onSelect }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
      width: '100%', maxWidth: 360,
    }}>
      {CATEGORIES.map((cat) => {
        const isSelected = selected === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
              padding: '0.75rem 0.5rem', borderRadius: 12, cursor: 'pointer',
              background: isSelected ? cat.color : '#1E293B',
              border: isSelected ? `2px solid ${cat.color}` : '2px solid transparent',
              color: '#F8FAFC', transition: 'transform 0.1s',
              transform: isSelected ? 'scale(0.97)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{cat.emoji}</span>
            <span style={{ fontSize: '0.7rem', textAlign: 'center' }}>{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/TypeToggle.jsx`**

```jsx
export default function TypeToggle({ type, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', background: '#1E293B', borderRadius: 10, padding: 4,
    }}>
      {['expense', 'income'].map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '0.4rem 1.1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 600, textTransform: 'capitalize',
            background: type === t ? (t === 'income' ? '#10B981' : '#334155') : 'transparent',
            color: '#F8FAFC',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/SplitButton.jsx`**

```jsx
export default function SplitButton({ onSplit, active }) {
  return (
    <button
      onClick={onSplit}
      style={{
        padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
        background: active ? '#10B981' : '#1E293B',
        border: '1px solid #334155', color: '#F8FAFC',
      }}
      title="Split this in half and route to the shared pool"
    >
      ÷2 Split
    </button>
  )
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/AmountInput.jsx src/components/CategoryGrid.jsx src/components/TypeToggle.jsx src/components/SplitButton.jsx
git commit -m "feat: add log input components (amount, category grid, type toggle, split)"
```

---

## Task 6: UndoToast component (CLAUDE)

**Files:**
- Create: `src/components/UndoToast.jsx`

- [ ] **Step 1: Write `src/components/UndoToast.jsx`**

```jsx
import { useEffect, useState } from 'react'

/**
 * A 5-second undo toast. Calls onUndo if the user taps Undo, otherwise
 * calls onExpire after the countdown so the caller can finalize the action.
 */
export default function UndoToast({ message, onUndo, onExpire, durationMs = 5000 }) {
  const [remaining, setRemaining] = useState(Math.ceil(durationMs / 1000))

  useEffect(() => {
    const expireTimer = setTimeout(onExpire, durationMs)
    const tick = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => { clearTimeout(expireTimer); clearInterval(tick) }
  }, [durationMs, onExpire])

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1E293B', color: '#F8FAFC', borderRadius: 12,
      padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 1000, minWidth: 280,
    }}>
      <span style={{ flex: 1, fontSize: '0.9rem' }}>{message}</span>
      <button
        onClick={onUndo}
        style={{
          background: 'none', border: 'none', color: '#10B981', fontWeight: 700,
          cursor: 'pointer', fontSize: '0.9rem',
        }}
      >
        Undo ({remaining})
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/UndoToast.jsx
git commit -m "feat: add 5-second undo toast component"
```

---

## Task 7: LogPage — Quick Log + Full Log screen wiring (CLAUDE)

**Files:**
- Create: `src/pages/LogPage.jsx`
- Modify: `src/App.jsx` (add /log route)

- [ ] **Step 1: Write `src/pages/LogPage.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { normalizeAmount, validateAmount, splitInHalf } from '../lib/expense.js'
import { addExpense } from '../lib/expenseStore.js'
import AmountInput from '../components/AmountInput.jsx'
import CategoryGrid from '../components/CategoryGrid.jsx'
import TypeToggle from '../components/TypeToggle.jsx'
import SplitButton from '../components/SplitButton.jsx'

export default function LogPage() {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const navigate = useNavigate()

  const [amountText, setAmountText] = useState('')
  const [categoryId, setCategoryId] = useState(null)
  const [type, setType] = useState('expense')
  const [poolType, setPoolType] = useState('personal')
  const [showDetails, setShowDetails] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const amount = normalizeAmount(amountText)
  const canSave = validateAmount(amount) && categoryId && !saving

  function handleSplit() {
    if (!validateAmount(amount)) return
    setAmountText(String(splitInHalf(amount)))
    setPoolType('split')
  }

  // Income is always personal — enforce on toggle.
  function handleTypeChange(next) {
    setType(next)
    if (next === 'income') setPoolType('personal')
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await addExpense({
        uid: user.uid,
        householdId,
        amount,
        categoryId,
        type,
        poolType: type === 'income' ? 'personal' : poolType,
        note,
      })
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Failed to save', err)
      setSaving(false)
    }
  }

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '2rem', gap: '1.5rem' }}>
      <TypeToggle type={type} onChange={handleTypeChange} />

      <AmountInput value={amountText} onChange={setAmountText} />

      {type === 'expense' && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <SplitButton onSplit={handleSplit} active={poolType === 'split'} />
          <button
            onClick={() => setPoolType(poolType === 'shared' ? 'personal' : 'shared')}
            style={{
              padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
              background: poolType === 'shared' ? '#10B981' : '#1E293B',
              border: '1px solid #334155', color: '#F8FAFC',
            }}
          >
            {poolType === 'shared' ? 'Shared ✓' : 'Personal'}
          </button>
        </div>
      )}

      <CategoryGrid selected={categoryId} onSelect={setCategoryId} />

      {showDetails && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          style={{
            width: '100%', maxWidth: 360, padding: '0.75rem', borderRadius: 10,
            background: '#1E293B', border: '1px solid #334155', color: '#F8FAFC', outline: 'none',
          }}
        />
      )}

      <button
        onClick={() => setShowDetails((s) => !s)}
        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '0.85rem' }}
      >
        {showDetails ? '− Hide details' : '+ Add details'}
      </button>

      <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/', { replace: true })}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the `/log` route in `src/App.jsx`**

Add the import:
```jsx
import LogPage from './pages/LogPage.jsx'
```

Add this route inside `<Routes>`, before the catch-all `/*` route:
```jsx
<Route
  path="/log"
  element={
    <AuthGate>
      <HouseholdGate>
        <LogPage />
      </HouseholdGate>
    </AuthGate>
  }
/>
```

- [ ] **Step 3: Add a temporary link from HomePage to the Log screen for manual testing**

Modify `src/pages/HomePage.jsx`:
```jsx
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="page-center">
      <h1>DollarSmart</h1>
      <p>Home (placeholder)</p>
      <Link to="/log" className="btn btn-primary" style={{ marginTop: '1rem', textDecoration: 'none' }}>
        + Log
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Verify the build compiles and unit tests pass**

Run: `npm run build`
Expected: build succeeds.

Run: `npm test`
Expected: all unit tests pass (categories + expense + household).

- [ ] **Step 5: Commit**

```bash
git add src/pages/LogPage.jsx src/App.jsx src/pages/HomePage.jsx
git commit -m "feat: add Log screen with Quick Log, split, type toggle, details"
```

---

## Phase 3 Done — Definition of Complete

- [ ] `npm test` passes — categories, expense math, household logic all green
- [ ] Quick Log flow: amount → category → save writes to Firestore in under 20 seconds of interaction
- [ ] ÷2 Split button halves the amount and tags the entry as `split` → shared pool
- [ ] Type toggle switches expense/income; income forces personal pool
- [ ] "+ Add details" reveals an optional note field (Full Log)
- [ ] Amount input normalizes currency symbols, commas, and rounds to cents
- [ ] Invalid amounts (zero, negative, non-numeric) disable Save
- [ ] Offline: Firestore IndexedDB persistence enabled — logging works with no connection and syncs on reconnect
- [ ] UndoToast component built (wired into the Expenses feed delete flow in Phase 4)

**Next phase:** Phase 4 — Expense Feed & Budgets (feed with filters, edit/delete with undo, monthly targets, animated progress bars, streak badge, CSV export).
