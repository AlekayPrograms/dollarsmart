# DollarSmart UI/UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish DollarSmart's UI/UX to a "Crisp + Insightful" standard with Framer Motion spring gestures, a glanceable Home spending hero, a custom Log keypad with always-visible categories, swipe-to-act on expenses, expandable notes, and a fix for the Android edit-sheet Save button being cut off.

**Architecture:** Add Framer Motion as the only new dependency. Build a shared foundation first (design tokens, motion presets, haptics util, primitives), then upgrade each screen independently. Phases 1–5 are independently shippable. Pure logic functions (leftToSpend, quickLog chips, categoryPredictor) get TDD with Vitest; visual/interaction changes are verified in-browser. Each task ends with a commit.

**Tech Stack:** React 18, Vite, Firebase/Firestore, Framer Motion, Vitest (logic-only tests), PWA (vite-plugin-pwa)

---

## File Map

**New files:**
- `src/lib/motion.js` — Spring presets and fade/slide variants
- `src/lib/haptics.js` — Thin vibrate wrapper
- `src/lib/haptics.test.js` — Vitest unit tests
- `src/lib/quickLog.js` — Quick-log chip computation
- `src/lib/quickLog.test.js`
- `src/lib/categoryPredictor.js` — Auto-suggest category from merchant history
- `src/lib/categoryPredictor.test.js`
- `src/lib/budget.test.js` — Tests for new leftToSpend function
- `src/components/ui/Skeleton.jsx` — Shimmer placeholder
- `src/components/ui/EmptyState.jsx` — Empty state display
- `src/components/ui/AnimatedNumber.jsx` — Count-up animation
- `src/components/ui/Sheet.jsx` — Drag-to-dismiss bottom sheet (fixes Android)
- `src/components/PageWrapper.jsx` — Framer Motion page enter/exit wrapper
- `src/components/Keypad.jsx` — Custom number keypad for Log

**Modified files:**
- `src/App.css` — Add design tokens, shimmer keyframe, remove CSS pageFade animation
- `src/App.jsx` — Add MotionConfig + AnimatePresence
- `src/lib/budget.js` — Add `leftToSpend` export
- `src/components/ProgressBar.jsx` — Animated fill width
- `src/components/ExpenseCard.jsx` — Swipe gestures + expandable notes
- `src/components/EditExpenseModal.jsx` — Use Sheet, pin Save, fix Android dvh bug
- `src/pages/ExpensesPage.jsx` — Skeleton loading + EmptyState
- `src/pages/HomePage.jsx` — Hero card, quick-log chips, pull-to-refresh
- `src/pages/LogPage.jsx` — New layout: date chip, Keypad, auto-suggest, details expansion
- `src/pages/InsightsPage.jsx` — Animated bars, swipe months, fix % display
- `src/pages/SettingsPage.jsx` — Consistent spacing/tokens, use PageWrapper

---

## Phase 0 — Foundation

---

### Task 1: Install Framer Motion

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install**
```bash
npm install framer-motion
```
Expected output: `added 1 package` (framer-motion has no sub-dependencies at v11+).

- [ ] **Step 2: Verify import works**
Create a throwaway check — open `src/main.jsx`, add `import { motion } from 'framer-motion'` at the top, run `npm run dev`, confirm no build error, then remove the import.

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "feat: add framer-motion"
```

---

### Task 2: Design Tokens + Shimmer Keyframe

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Add tokens and shimmer to `:root` and global styles**

In `src/App.css`, extend the `:root` block and add the shimmer keyframe. Replace the existing `:root` block and `pageFade` animation with:

```css
:root {
  color-scheme: dark;
  --bg: #191919;
  --surface: #252525;
  --surface-2: #2f2f2f;
  --border: rgba(255, 255, 255, 0.07);
  --text: rgba(255, 255, 255, 0.92);
  --muted: rgba(255, 255, 255, 0.55);
  --subtle: rgba(255, 255, 255, 0.3);
  --accent: #10B981;
  --warn: #F59E0B;
  --danger: #F87171;
  --nav-h: 60px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);

  /* type scale */
  --text-xs: 0.6875rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;

  /* radius scale */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* elevation */
  --shadow-card: 0 1px 3px rgba(0,0,0,.3), 0 1px 2px rgba(0,0,0,.2);
  --shadow-sheet: 0 -4px 32px rgba(0,0,0,.5);
  --shadow-fab: 0 4px 14px rgba(16,185,129,.35);

  /* motion */
  --duration-fast: 120ms;
  --duration-base: 220ms;
  --duration-slow: 380ms;
}
```

- [ ] **Step 2: Remove the CSS pageFade animation and replace with a no-op comment**

Find and remove these lines from `src/App.css`:
```css
@keyframes pageFade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Each route mounts a fresh page container, so this animates screen changes. */
.page-root, .page-center { animation: pageFade 0.24s cubic-bezier(0.4, 0, 0.2, 1) both; }

@media (prefers-reduced-motion: reduce) {
  .page-root, .page-center { animation: none; }
}
```

PageWrapper (Task 9) replaces this with Framer Motion.

- [ ] **Step 3: Add shimmer keyframe (for Skeleton component)**

Append to `src/App.css`:
```css
/* ─── Shimmer (used by Skeleton) ────────────────────────── */
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
```

- [ ] **Step 4: Verify dev server still starts**
```bash
npm run dev
```
Open http://localhost:5173. Pages should still render (animation just gone temporarily until PageWrapper lands in Task 9).

- [ ] **Step 5: Commit**
```bash
git add src/App.css
git commit -m "feat: add design tokens and shimmer keyframe; remove CSS pageFade"
```

---

### Task 3: Motion Presets

**Files:**
- Create: `src/lib/motion.js`

- [ ] **Step 1: Create the file**

```js
// src/lib/motion.js
export const spring = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  smooth: { type: 'spring', stiffness: 260, damping: 28 },
  gentle: { type: 'spring', stiffness: 180, damping: 24 },
  swipe:  { type: 'spring', stiffness: 500, damping: 40 },
}

export const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
}

export const slideRight = {
  initial: { x: 30, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit:    { x: -20, opacity: 0 },
}

export const slideLeft = {
  initial: { x: -30, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit:    { x: 20, opacity: 0 },
}
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/motion.js
git commit -m "feat: add framer-motion spring presets and page transition variants"
```

---

### Task 4: Haptics Utility + Tests

**Files:**
- Create: `src/lib/haptics.js`
- Create: `src/lib/haptics.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/haptics.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { haptics } from './haptics.js'

describe('haptics', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { vibrate: vi.fn() })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('light calls vibrate(8)', () => {
    haptics.light()
    expect(navigator.vibrate).toHaveBeenCalledWith(8)
  })

  it('medium calls vibrate(18)', () => {
    haptics.medium()
    expect(navigator.vibrate).toHaveBeenCalledWith(18)
  })

  it('success calls vibrate([10, 40, 10])', () => {
    haptics.success()
    expect(navigator.vibrate).toHaveBeenCalledWith([10, 40, 10])
  })

  it('warning calls vibrate(30)', () => {
    haptics.warning()
    expect(navigator.vibrate).toHaveBeenCalledWith(30)
  })

  it('does not throw when vibrate is undefined', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptics.light()).not.toThrow()
    expect(() => haptics.success()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests — expect failure**
```bash
npm test -- haptics
```
Expected: `Cannot find module './haptics.js'`

- [ ] **Step 3: Implement**

```js
// src/lib/haptics.js
export const haptics = {
  light:   () => navigator.vibrate?.(8),
  medium:  () => navigator.vibrate?.(18),
  success: () => navigator.vibrate?.([10, 40, 10]),
  warning: () => navigator.vibrate?.(30),
}
```

- [ ] **Step 4: Run tests — expect pass**
```bash
npm test -- haptics
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/haptics.js src/lib/haptics.test.js
git commit -m "feat: add haptics utility with vibrate patterns"
```

---

### Task 5: Skeleton Component

**Files:**
- Create: `src/components/ui/Skeleton.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/Skeleton.jsx
export default function Skeleton({ width = '100%', height = 20, borderRadius = 8, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite linear',
        ...style,
      }}
    />
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/ui/Skeleton.jsx
git commit -m "feat: add Skeleton shimmer component"
```

---

### Task 6: EmptyState Component

**Files:**
- Create: `src/components/ui/EmptyState.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/EmptyState.jsx
export default function EmptyState({ icon, heading, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--subtle)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--muted)' }}>
        {heading}
      </p>
      {sub && (
        <p style={{ margin: '0.35rem 0 0', fontSize: 'var(--text-sm)' }}>{sub}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/ui/EmptyState.jsx
git commit -m "feat: add EmptyState component"
```

---

### Task 7: AnimatedNumber Component

**Files:**
- Create: `src/components/ui/AnimatedNumber.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/AnimatedNumber.jsx
import { useEffect, useRef } from 'react'
import { useMotionValue, animate } from 'framer-motion'

export default function AnimatedNumber({ value, prefix = '', decimals = 0, style = {} }) {
  const motionVal = useMotionValue(value)
  const ref = useRef(null)

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = prefix + v.toFixed(decimals)
        }
      },
    })
    return controls.stop
  }, [value, prefix, decimals])

  return (
    <span ref={ref} style={style}>
      {prefix}{value.toFixed(decimals)}
    </span>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/ui/AnimatedNumber.jsx
git commit -m "feat: add AnimatedNumber count-up component"
```

---

### Task 8: Sheet Component (fixes Android Save cutoff)

**Files:**
- Create: `src/components/ui/Sheet.jsx`

The Android bug: `max-height: 90vh` measures height including the hidden browser chrome on Android, so the Save button lands below the visible viewport. Fix: use `90dvh` (dynamic viewport height = always the visible area) and pin the footer with sticky positioning.

- [ ] **Step 1: Create the component**

```jsx
// src/components/ui/Sheet.jsx
import { motion, AnimatePresence } from 'framer-motion'

export default function Sheet({ open, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
            }}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose() }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
              maxHeight: '90dvh',
              background: 'var(--bg)',
              borderTopLeftRadius: 'var(--radius-xl)',
              borderTopRightRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
              display: 'flex', flexDirection: 'column',
              maxWidth: 480, margin: '0 auto',
              boxShadow: 'var(--shadow-sheet)',
            }}
          >
            {/* drag handle */}
            <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            {title && (
              <div style={{ padding: '0.75rem 1rem 0', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>{title}</h3>
              </div>
            )}

            {/* scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem 1rem' }}>
              {children}
            </div>

            {/* pinned footer — always visible, never hidden by keyboard or viewport */}
            {footer && (
              <div style={{
                flexShrink: 0,
                padding: '0.75rem 1rem',
                paddingBottom: 'calc(0.75rem + var(--safe-bottom))',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg)',
              }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/ui/Sheet.jsx
git commit -m "feat: add drag-to-dismiss Sheet component with pinned footer (fixes Android dvh bug)"
```

---

### Task 9: PageWrapper + App.jsx MotionConfig

**Files:**
- Create: `src/components/PageWrapper.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create PageWrapper**

```jsx
// src/components/PageWrapper.jsx
import { motion } from 'framer-motion'
import { fade } from '../lib/motion.js'
import { spring } from '../lib/motion.js'

export default function PageWrapper({ children, className = 'page-root', style }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={fade.initial}
      animate={fade.animate}
      exit={fade.exit}
      transition={spring.smooth}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Wrap App routes with MotionConfig + AnimatePresence**

Replace the contents of `src/App.jsx` with:

```jsx
// src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { MotionConfig } from 'framer-motion'
import AuthGate from './components/AuthGate.jsx'
import HouseholdGate from './components/HouseholdGate.jsx'
import BottomNav from './components/BottomNav.jsx'
import RecurringRunner from './components/RecurringRunner.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LogPage from './pages/LogPage.jsx'
import ExpensesPage from './pages/ExpensesPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

const NO_NAV = ['/login', '/onboarding']

function App() {
  const location = useLocation()
  const showNav = !NO_NAV.includes(location.pathname)

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<AuthGate><OnboardingPage /></AuthGate>} />
          <Route path="/log" element={<AuthGate><HouseholdGate><LogPage /></HouseholdGate></AuthGate>} />
          <Route path="/expenses" element={<AuthGate><HouseholdGate><ExpensesPage /></HouseholdGate></AuthGate>} />
          <Route path="/insights" element={<AuthGate><HouseholdGate><InsightsPage /></HouseholdGate></AuthGate>} />
          <Route path="/settings" element={<AuthGate><HouseholdGate><SettingsPage /></HouseholdGate></AuthGate>} />
          <Route path="/*" element={<AuthGate><HouseholdGate><HomePage /></HouseholdGate></AuthGate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      {showNav && <BottomNav />}
      <RecurringRunner />
    </MotionConfig>
  )
}

export default App
```

- [ ] **Step 3: Update all pages to use PageWrapper**

For each page in `src/pages/`, replace the outermost `<div className="page-root">` or `<div className="page-center">` with `<PageWrapper className="page-root">` or `<PageWrapper className="page-center">`. Import PageWrapper at the top of each file.

Do this for: `HomePage.jsx`, `ExpensesPage.jsx`, `InsightsPage.jsx`, `SettingsPage.jsx`.  
Skip `LogPage.jsx` — it gets a full rewrite in Phase 3.

Example for `HomePage.jsx` — change:
```jsx
return (
  <div className="page-center" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
```
to:
```jsx
import PageWrapper from '../components/PageWrapper.jsx'
// ...
return (
  <PageWrapper className="page-center" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
```
And close `</PageWrapper>` instead of `</div>`.

Apply the same pattern to `ExpensesPage.jsx`, `InsightsPage.jsx`, `SettingsPage.jsx`.

- [ ] **Step 4: Verify page transitions**

```bash
npm run dev
```

Open http://localhost:5173. Tap between tabs — each page should fade+slide in smoothly. Check that the animation respects `prefers-reduced-motion` (set in OS accessibility settings to confirm, or in Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`).

- [ ] **Step 5: Commit**
```bash
git add src/App.jsx src/components/PageWrapper.jsx src/pages/HomePage.jsx src/pages/ExpensesPage.jsx src/pages/InsightsPage.jsx src/pages/SettingsPage.jsx
git commit -m "feat: add MotionConfig, AnimatePresence page transitions, PageWrapper"
```

---

## Phase 1 — Expenses + Edit Sheet

---

### Task 10: leftToSpend Calculation

**Files:**
- Modify: `src/lib/budget.js`
- Create: `src/lib/budget.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/budget.test.js
import { describe, it, expect } from 'vitest'
import { leftToSpend } from './budget.js'

describe('leftToSpend', () => {
  it('returns null when targets is empty', () => {
    expect(leftToSpend({ food: 100 }, {})).toBeNull()
  })

  it('returns null when all targets are 0', () => {
    expect(leftToSpend({ food: 100 }, { food: 0 })).toBeNull()
  })

  it('calculates remaining budget correctly', () => {
    const result = leftToSpend(
      { food: 200, transport: 80 },
      { food: 600, transport: 250 }
    )
    expect(result.left).toBe(570)
    expect(result.total).toBe(850)
    expect(result.spent).toBe(280)
  })

  it('only counts spending in targeted categories', () => {
    const result = leftToSpend(
      { food: 200, groceries: 150 },
      { food: 600 }
    )
    expect(result.spent).toBe(200)
    expect(result.left).toBe(400)
  })

  it('left is negative when over budget', () => {
    const result = leftToSpend({ food: 700 }, { food: 600 })
    expect(result.left).toBe(-100)
  })

  it('pct is clamped to 1 when over budget', () => {
    const result = leftToSpend({ food: 800 }, { food: 600 })
    expect(result.pct).toBe(1)
  })

  it('handles unspent categories (0 spent)', () => {
    const result = leftToSpend({}, { food: 600 })
    expect(result.left).toBe(600)
    expect(result.spent).toBe(0)
    expect(result.pct).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**
```bash
npm test -- budget
```
Expected: `leftToSpend is not a function`

- [ ] **Step 3: Add leftToSpend to budget.js**

Append to the bottom of `src/lib/budget.js`:

```js
// Returns { left, total, spent, pct } for the hero card, or null if no targets set.
// Only spending in targeted categories counts toward the total — unbudgeted categories
// are excluded so the hero number is honest.
export function leftToSpend(spentByCategory, targets) {
  const total = Object.values(targets).reduce((a, b) => a + b, 0)
  if (total === 0) return null

  const spent = Object.keys(targets).reduce((sum, catId) => {
    return sum + (spentByCategory[catId] ?? 0)
  }, 0)

  return {
    left: total - spent,
    total,
    spent,
    pct: Math.min(spent / total, 1),
  }
}
```

- [ ] **Step 4: Run tests — expect pass**
```bash
npm test -- budget
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/budget.js src/lib/budget.test.js
git commit -m "feat: add leftToSpend calculation for Home hero card"
```

---

### Task 11: Expandable Notes in ExpenseCard

**Files:**
- Modify: `src/components/ExpenseCard.jsx`

Notes longer than 60 characters truncate with "…" and show a "▾ more" affordance. Tap to expand inline; tap again to collapse.

- [ ] **Step 1: Add expandable note state and rendering**

At the top of the `ExpenseCard` function body (after the existing `useState` for `editing`/`draft`), add:

```js
const [noteExpanded, setNoteExpanded] = useState(false)
const NOTE_LIMIT = 60
const longNote = expense.note && expense.note.length > NOTE_LIMIT
```

Replace the existing note block (currently at line ~133):
```jsx
{expense.note && (
  <div style={{ fontSize: '0.75rem', color: 'var(--subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
    {expense.note}
  </div>
)}
```

With:
```jsx
{expense.note && (
  <div
    onClick={longNote ? () => setNoteExpanded((v) => !v) : undefined}
    style={{ fontSize: 'var(--text-xs)', color: 'var(--subtle)', marginTop: 2, cursor: longNote ? 'pointer' : 'default' }}
  >
    {noteExpanded || !longNote
      ? expense.note
      : expense.note.slice(0, NOTE_LIMIT) + '…'}
    {longNote && (
      <span style={{ color: 'var(--accent)', fontWeight: 600, marginLeft: 4 }}>
        {noteExpanded ? '▴ less' : '▾ more'}
      </span>
    )}
  </div>
)}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Go to Expenses. Find (or log) an expense with a long note. Confirm it truncates with "▾ more" and expands/collapses on tap.

- [ ] **Step 3: Commit**
```bash
git add src/components/ExpenseCard.jsx
git commit -m "feat: tap to expand long notes in expense cards"
```

---

### Task 12: Swipe-to-Act on Expense Rows

**Files:**
- Modify: `src/components/ExpenseCard.jsx`

Swipe left → Delete (red). Swipe right → Edit (blue). Both snap back if not committed. The existing `onDelete` callback is already wired to the undo toast in `ExpensesPage`, so swipe-delete gets undo for free.

- [ ] **Step 1: Add framer-motion imports to ExpenseCard**

Add to the top of `src/components/ExpenseCard.jsx`:
```js
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { spring } from '../lib/motion.js'
import { haptics } from '../lib/haptics.js'
```

- [ ] **Step 2: Add swipe state and handlers inside ExpenseCard function**

After the existing `noteExpanded` state, add:

```js
const x = useMotionValue(0)
const SWIPE_THRESHOLD = 65

const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20, 0], [1, 0.4, 0])
const editOpacity   = useTransform(x, [0, 20, SWIPE_THRESHOLD], [0, 0.4, 1])

const canSwipeDelete = !!onDelete && !selectMode
const canSwipeEdit   = !!onEdit && !selectMode

async function handleDragEnd(_, info) {
  const off = info.offset.x
  const vel = info.velocity.x

  if (canSwipeDelete && (off < -SWIPE_THRESHOLD || vel < -400)) {
    haptics.warning()
    await animate(x, -500, { duration: 0.18 })
    onDelete(expense)
  } else if (canSwipeEdit && (off > SWIPE_THRESHOLD || vel > 400)) {
    haptics.light()
    onEdit(expense)
    animate(x, 0, spring.swipe)
  } else {
    animate(x, 0, spring.swipe)
  }
}
```

- [ ] **Step 3: Wrap the card return in a swipe container**

Replace the outermost `<div>` return in `ExpenseCard` (the one with `display: 'flex', alignItems: 'center'...`) with this structure:

```jsx
return (
  <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
    {/* Edit reveal (right swipe) */}
    <motion.div style={{
      opacity: editOpacity, position: 'absolute', inset: 0,
      background: '#3b82f6', borderRadius: 14,
      display: 'flex', alignItems: 'center', paddingLeft: 18,
    }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: 'var(--text-sm)' }}>✎ Edit</span>
    </motion.div>

    {/* Delete reveal (left swipe) */}
    <motion.div style={{
      opacity: deleteOpacity, position: 'absolute', inset: 0,
      background: 'var(--danger)', borderRadius: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 18,
    }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: 'var(--text-sm)' }}>🗑 Delete</span>
    </motion.div>

    {/* The draggable card */}
    <motion.div
      drag={(canSwipeDelete || canSwipeEdit) ? 'x' : false}
      dragConstraints={{ left: -80, right: 80 }}
      dragElastic={0.08}
      onDragEnd={handleDragEnd}
      style={{
        x,
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'var(--surface)', borderRadius: 14,
        padding: '0.75rem 0.875rem', width: '100%',
        border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
        cursor: selectable ? 'pointer' : 'default',
        opacity: selectMode && !selectable ? 0.45 : 1,
        transition: 'border-color 0.15s, opacity 0.15s',
      }}
      onClick={selectable ? () => onToggleSelect(expense) : undefined}
    >
      {/* === ALL EXISTING INNER CARD JSX GOES HERE UNCHANGED === */}
      {/* (selectMode circle, category icon, middle column, right column) */}
    </motion.div>
  </div>
)
```

Move all existing inner card JSX (the `selectMode` circle, the category icon div, the middle column `flex: 1` div, and the right column amount/buttons div) inside the `<motion.div>` that previously had `onClick`.

Remove `onClick` from the outer `<div>` (it's now on the `<motion.div>`).

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Go to Expenses. Swipe an expense card left — Delete (red) should reveal, release past threshold to delete (undo toast appears). Swipe right — Edit (blue) should reveal and open the edit modal. Partial swipes should snap back.

- [ ] **Step 5: Commit**
```bash
git add src/components/ExpenseCard.jsx
git commit -m "feat: swipe left to delete, swipe right to edit expense cards"
```

---

### Task 13: EditExpenseModal → Sheet (Android Fix)

**Files:**
- Modify: `src/components/EditExpenseModal.jsx`

The Android bug: the existing modal uses `max-height: 90vh` which measures behind the Android address bar. The Sheet component (Task 8) uses `90dvh` and pins the footer above the safe area — Save is always reachable.

- [ ] **Step 1: Rewrite EditExpenseModal to use Sheet**

Replace the entire file content:

```jsx
// src/components/EditExpenseModal.jsx
import { useState } from 'react'
import { normalizeAmount, validateAmount } from '../lib/expense.js'
import AmountInput from './AmountInput.jsx'
import CategoryGrid from './CategoryGrid.jsx'
import Sheet from './ui/Sheet.jsx'
import { haptics } from '../lib/haptics.js'

function toDateInput(date) {
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EditExpenseModal({ expense, onSave, onClose }) {
  const isIncome = expense.type === 'income'
  const [amountText, setAmountText] = useState(String(expense.amount ?? ''))
  const [categoryId, setCategoryId] = useState(expense.categoryId ?? null)
  const [poolType, setPoolType] = useState(expense.poolType ?? 'personal')
  const [merchantName, setMerchantName] = useState(expense.merchantName ?? '')
  const [note, setNote] = useState(expense.note ?? '')
  const [dateStr, setDateStr] = useState(toDateInput(expense.date))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const amount = normalizeAmount(amountText)
  const canSave = validateAmount(amount) && (isIncome || categoryId) && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const nextPool = isIncome ? 'personal' : poolType
      await onSave(expense.id, {
        amount,
        categoryId: isIncome ? (expense.categoryId ?? 'other') : categoryId,
        poolType: nextPool,
        merchantName,
        note,
        date: new Date(dateStr + 'T12:00:00'),
        splitRatio: nextPool === 'split' ? (expense.splitRatio ?? 0.5) : null,
      })
      haptics.success()
      onClose()
    } catch (err) {
      console.error('Failed to update expense', err)
      setError("Couldn't save — check your connection and try again.")
      setSaving(false)
    }
  }

  const footer = (
    <div style={{ display: 'flex', gap: '0.875rem' }}>
      <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
        Cancel
      </button>
      <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={!canSave}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )

  return (
    <Sheet open onClose={onClose} title={`Edit ${isIncome ? 'income' : 'expense'}`} footer={footer}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
        <AmountInput value={amountText} onChange={setAmountText} autoFocus={false} />

        {!isIncome && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['personal', 'split'].map((p) => (
              <button
                key={p}
                onClick={() => setPoolType(p)}
                style={{
                  padding: '0.45rem 0.9rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
                  textTransform: 'capitalize', fontSize: 'var(--text-sm)',
                  background: poolType === p ? 'var(--accent)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: poolType === p ? '#fff' : 'var(--text)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {!isIncome && <CategoryGrid selected={categoryId} onSelect={setCategoryId} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
          <input type="text" value={merchantName} onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Company / merchant (optional)" style={fieldStyle} />
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)}
            style={{ ...fieldStyle, colorScheme: 'dark' }} />
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)" style={fieldStyle} />
        </div>

        {error && (
          <p style={{ width: '100%', maxWidth: 360, margin: 0, color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}

const fieldStyle = {
  width: '100%', padding: '0.75rem', borderRadius: 10,
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
}
```

- [ ] **Step 2: Verify the Android fix in browser (or DevTools)**

```bash
npm run dev
```

In Chrome DevTools → Device toolbar, select a Pixel device. Open an expense's edit modal. Confirm the Save button is fully visible at the bottom and doesn't get cut off. The sheet should also be drag-to-dismiss (drag the handle down to close).

- [ ] **Step 3: Commit**
```bash
git add src/components/EditExpenseModal.jsx
git commit -m "fix: edit sheet uses Sheet component with dvh + pinned save (fixes Android cutoff)"
```

---

### Task 14: Skeleton Loading + EmptyState in ExpensesPage

**Files:**
- Modify: `src/pages/ExpensesPage.jsx`

- [ ] **Step 1: Import new components**

Add to the top of `src/pages/ExpensesPage.jsx`:
```js
import Skeleton from '../components/ui/Skeleton.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
```

- [ ] **Step 2: Replace the loading and empty states**

Find:
```jsx
{loading && <p style={{ color: 'var(--subtle)', fontSize: '0.875rem' }}>Loading…</p>}
{!loading && visible.length === 0 && (
  <p style={{ color: 'var(--subtle)', fontSize: '0.875rem' }}>No expenses match this filter.</p>
)}
```

Replace with:
```jsx
{loading && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 440 }}>
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} height={72} borderRadius={14} />
    ))}
  </div>
)}
{!loading && visible.length === 0 && (
  <EmptyState
    icon="🧾"
    heading="No expenses here"
    sub={filters.pool !== 'all' || filters.category !== 'all' || filters.period.mode !== 'all'
      ? 'Try adjusting your filters'
      : 'Tap + Log to add your first one'}
  />
)}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Throttle network in DevTools → Network → Slow 3G. Reload the Expenses page — shimmer skeletons should appear before data loads. Also verify the empty state shows correctly when filters produce no results.

- [ ] **Step 4: Commit**
```bash
git add src/pages/ExpensesPage.jsx
git commit -m "feat: skeleton loading and illustrated empty states on Expenses page"
```

---

## Phase 2 — Home

---

### Task 15: Animated ProgressBar

**Files:**
- Modify: `src/components/ProgressBar.jsx`

- [ ] **Step 1: Read the current file**

Read `src/components/ProgressBar.jsx` to understand its current rendering before editing.

- [ ] **Step 2: Wrap the fill in a motion.div**

Import and wrap the fill div so it animates its width from 0 on mount:

```jsx
// src/components/ProgressBar.jsx
import { motion } from 'framer-motion'
import { spring } from '../lib/motion.js'
import { budgetProgress } from '../lib/budget.js'

export default function ProgressBar({ spent, target, color }) {
  const { ratio, status } = budgetProgress(spent, target)
  const fillColor = color
    ?? (status === 'over' ? 'var(--danger)' : status === 'warn' ? 'var(--warn)' : 'var(--accent)')
  const pct = target > 0 ? Math.min(ratio * 100, 100) : 100

  return (
    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={spring.gentle}
        style={{ height: '100%', borderRadius: 3, background: fillColor }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open Home page — budget bars should animate their fill width from 0 on mount.

- [ ] **Step 4: Commit**
```bash
git add src/components/ProgressBar.jsx
git commit -m "feat: animate ProgressBar fill width with framer-motion spring"
```

---

### Task 16: Quick-Log Chip Logic

**Files:**
- Create: `src/lib/quickLog.js`
- Create: `src/lib/quickLog.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/quickLog.test.js
import { describe, it, expect } from 'vitest'
import { getQuickLogChips } from './quickLog.js'

const now = new Date('2026-06-19T12:00:00')
const msPerDay = 86400000
const recent = (daysAgo) => new Date(now.getTime() - daysAgo * msPerDay)

describe('getQuickLogChips', () => {
  it('returns [] for no expenses', () => {
    expect(getQuickLogChips([], now)).toEqual([])
  })

  it('ignores income entries', () => {
    const e = [{ type: 'income', poolType: 'personal', categoryId: 'food', amount: 5, date: recent(1) }]
    expect(getQuickLogChips(e, now)).toEqual([])
  })

  it('ignores split expenses', () => {
    const e = [{ type: 'expense', poolType: 'split', categoryId: 'food', amount: 5, date: recent(1) }]
    expect(getQuickLogChips(e, now)).toEqual([])
  })

  it('ignores expenses older than 90 days', () => {
    const e = [{ type: 'expense', poolType: 'personal', categoryId: 'food', amount: 5, date: recent(91) }]
    expect(getQuickLogChips(e, now)).toEqual([])
  })

  it('returns top 3 sorted by frequency', () => {
    const e = [
      ...Array(3).fill(null).map((_, i) => ({ type: 'expense', poolType: 'personal', categoryId: 'food', amount: 5, date: recent(i + 1) })),
      ...Array(2).fill(null).map((_, i) => ({ type: 'expense', poolType: 'personal', categoryId: 'transport', amount: 40, date: recent(i + 1) })),
      { type: 'expense', poolType: 'personal', categoryId: 'groceries', amount: 60, date: recent(1) },
      { type: 'expense', poolType: 'personal', categoryId: 'health', amount: 25, date: recent(1) },
    ]
    const chips = getQuickLogChips(e, now)
    expect(chips).toHaveLength(3)
    expect(chips[0]).toMatchObject({ categoryId: 'food', amount: 5, count: 3 })
    expect(chips[1]).toMatchObject({ categoryId: 'transport', amount: 40, count: 2 })
  })

  it('groups $4.99 and $5.01 as the same $5 chip', () => {
    const e = [
      { type: 'expense', poolType: 'personal', categoryId: 'food', amount: 4.99, date: recent(1) },
      { type: 'expense', poolType: 'personal', categoryId: 'food', amount: 5.01, date: recent(2) },
    ]
    const chips = getQuickLogChips(e, now)
    expect(chips).toHaveLength(1)
    expect(chips[0].count).toBe(2)
    expect(chips[0].amount).toBe(5)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**
```bash
npm test -- quickLog
```
Expected: `Cannot find module './quickLog.js'`

- [ ] **Step 3: Implement**

```js
// src/lib/quickLog.js
function toMs(date) {
  if (!date) return 0
  if (date.toDate) return date.toDate().getTime()
  return new Date(date).getTime()
}

export function getQuickLogChips(expenses, now = new Date(), limit = 3) {
  const cutoff = now.getTime() - 90 * 86400000
  const counts = {}

  for (const e of expenses) {
    if (e.type !== 'expense' || e.poolType !== 'personal') continue
    if (toMs(e.date) < cutoff) continue
    const amount = Math.round(e.amount)
    const key = `${e.categoryId}:${amount}`
    if (!counts[key]) counts[key] = { categoryId: e.categoryId, amount, count: 0 }
    counts[key].count++
  }

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
```

- [ ] **Step 4: Run tests — expect pass**
```bash
npm test -- quickLog
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/quickLog.js src/lib/quickLog.test.js
git commit -m "feat: quick-log chip computation with 90-day frequency ranking"
```

---

### Task 17: Home Hero Card

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Update imports and add leftToSpend + AnimatedNumber**

Replace the import block at the top of `src/pages/HomePage.jsx` with:

```js
import { Link } from 'react-router-dom'
import { useExpenses } from '../hooks/useExpenses.js'
import { useMonthlyTargets } from '../hooks/useMonthlyTargets.js'
import { sumByCategory, budgetProgress, leftToSpend } from '../lib/budget.js'
import { CATEGORIES } from '../lib/categories.js'
import ProgressBar from '../components/ProgressBar.jsx'
import PendingTransactionBanner from '../components/PendingTransactionBanner.jsx'
import ReconnectBanner from '../components/ReconnectBanner.jsx'
import BankBalanceCard from '../components/BankBalanceCard.jsx'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import PageWrapper from '../components/PageWrapper.jsx'
```

- [ ] **Step 2: Add hero card computation in the component body**

After the existing `spentByCategory` and `budgetRows` lines, add:

```js
const hero = leftToSpend(spentByCategory, personalTargets)
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
const daysLeft = daysInMonth - now.getDate()
const dailyPace = hero && daysLeft > 0 ? hero.left / daysLeft : null
const expectedDailyRate = hero ? hero.total / daysInMonth : null
const onPace = dailyPace !== null && expectedDailyRate !== null && dailyPace >= expectedDailyRate * 0.85
```

- [ ] **Step 3: Replace the hero section in the JSX**

Inside the `return`, after the header row (`<div style={{ display:'flex', justifyContent:'space-between'...}}>`) and the banners, add the hero card before `<BankBalanceCard />`:

```jsx
{hero && (
  <div style={{
    width: '100%', maxWidth: 440,
    background: 'var(--surface)', borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--border)', padding: '1.125rem 1.25rem',
    boxShadow: 'var(--shadow-card)',
  }}>
    <p style={{ margin: '0 0 4px', fontSize: 'var(--text-xs)', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>
      Left to spend
    </p>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <AnimatedNumber
        value={hero.left}
        prefix="$"
        decimals={0}
        style={{
          fontSize: '3rem', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1,
          color: hero.left < 0 ? 'var(--danger)' : '#ffffff',
        }}
      />
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--subtle)', paddingBottom: 4 }}>
        / ${hero.total.toFixed(0)}
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
      {hero.left >= 0 ? (
        <span style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: 'rgba(16,185,129,.15)', color: 'var(--accent)',
        }}>
          {onPace ? '✓ On pace' : '⚠ Spending fast'}
        </span>
      ) : (
        <span style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, padding: '3px 9px', borderRadius: 20,
          background: 'rgba(248,113,113,.15)', color: 'var(--danger)',
        }}>
          ⚠ Over budget
        </span>
      )}
      {daysLeft > 0 && dailyPace !== null && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--subtle)' }}>
          ${Math.max(dailyPace, 0).toFixed(0)}/day · {daysLeft} days left
        </span>
      )}
    </div>
    <div style={{ marginTop: 14 }}>
      <ProgressBar spent={hero.spent} target={hero.total} />
    </div>
  </div>
)}

{!hero && budgetRows.length === 0 && (
  <EmptyState
    icon="🎯"
    heading="Set a monthly budget"
    sub="Go to Settings → Monthly targets to get started"
  />
)}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Home page should show the hero card (if you have monthly targets set in Settings). The number should animate on mount. If no targets are set, the EmptyState prompt should appear.

- [ ] **Step 5: Commit**
```bash
git add src/pages/HomePage.jsx
git commit -m "feat: glanceable spending hero card with animated number and pace indicator"
```

---

### Task 18: Quick-Log Chips + Pull-to-Refresh on Home

**Files:**
- Modify: `src/pages/HomePage.jsx`

- [ ] **Step 1: Import quickLog + haptics**

Add to imports in `src/pages/HomePage.jsx`:
```js
import { getQuickLogChips } from '../lib/quickLog.js'
import { haptics } from '../lib/haptics.js'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
```

- [ ] **Step 2: Compute quick-log chips in the component body**

Add after `hero` computation:
```js
const navigate = useNavigate()
const chips = getQuickLogChips(expenses, now)
const [pullProgress, setPullProgress] = useState(0)
const [refreshing, setRefreshing] = useState(false)
const startYRef = useRef(null)
const scrollRef = useRef(null)
const PULL_THRESHOLD = 60
```

- [ ] **Step 3: Add touch handlers for pull-to-refresh**

Add these functions inside the component:
```js
function onTouchStart(e) {
  if (scrollRef.current?.scrollTop > 0) return
  startYRef.current = e.touches[0].clientY
}

function onTouchMove(e) {
  if (startYRef.current === null || refreshing) return
  if (scrollRef.current?.scrollTop > 0) { startYRef.current = null; return }
  const dy = e.touches[0].clientY - startYRef.current
  if (dy <= 0) return
  e.preventDefault()
  setPullProgress(Math.min(dy / PULL_THRESHOLD, 1.5))
}

async function onTouchEnd() {
  if (pullProgress >= 1) {
    setRefreshing(true)
    setPullProgress(0)
    // Expenses refetch automatically via Firestore listener; short delay for UX
    await new Promise((r) => setTimeout(r, 800))
    setRefreshing(false)
  } else {
    setPullProgress(0)
  }
  startYRef.current = null
}
```

- [ ] **Step 4: Add chips section and pull indicator to JSX**

Inside the PageWrapper return, after the hero card section, add the quick-log chips:

```jsx
{chips.length >= 3 && (
  <div style={{ width: '100%', maxWidth: 440 }}>
    <p style={{ margin: '0 0 0.5rem', fontSize: 'var(--text-xs)', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
      Quick log
    </p>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {chips.map((chip) => {
        const cat = CATEGORIES.find((c) => c.id === chip.categoryId)
        if (!cat) return null
        return (
          <motion.button
            key={`${chip.categoryId}:${chip.amount}`}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              haptics.light()
              navigate('/log', { state: { prefillAmount: chip.amount, prefillCategoryId: chip.categoryId } })
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '8px 12px',
              fontSize: 'var(--text-sm)', color: 'var(--text)',
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            {cat.emoji} {cat.label} <strong>${chip.amount}</strong>
          </motion.button>
        )
      })}
    </div>
  </div>
)}
```

And wrap the outermost PageWrapper div to be a scrollable ref:

```jsx
<PageWrapper
  className="page-center"
  style={{ justifyContent: 'flex-start', gap: '1rem' }}
  ref={scrollRef}  // Note: PageWrapper needs to forward refs — skip this if complex; use a plain wrapping div instead
>
  {(pullProgress > 0 || refreshing) && (
    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', textAlign: 'center', padding: '4px 0' }}>
      {refreshing ? '↺ Refreshing…' : pullProgress >= 1 ? '↑ Release' : '↓ Pull to refresh'}
    </div>
  )}
  ...
```

Alternatively, wrap the entire PageWrapper in a div with the touch handlers:
```jsx
return (
  <div
    ref={scrollRef}
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
    style={{ overflowY: 'auto', height: '100dvh' }}
  >
    <PageWrapper className="page-center" style={{ justifyContent: 'flex-start', gap: '1rem' }}>
      {(pullProgress > 0 || refreshing) && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', textAlign: 'center' }}>
          {refreshing ? '↺ Refreshing…' : pullProgress >= 1 ? '↑ Release' : '↓ Pull to refresh'}
        </div>
      )}
      {/* ... rest of content */}
    </PageWrapper>
  </div>
)
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Ensure you have ≥ 3 recent personal expenses with repeated amounts. Quick-log chips should appear. Tap one — it should navigate to Log with the amount and category prefilled. On a mobile device or in DevTools mobile emulation, pull down from the top to see the refresh indicator.

- [ ] **Step 6: Commit**
```bash
git add src/pages/HomePage.jsx
git commit -m "feat: quick-log chips and pull-to-refresh on Home page"
```

---

## Phase 3 — Log

---

### Task 19: Custom Keypad Component

**Files:**
- Create: `src/components/Keypad.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/Keypad.jsx
import { motion } from 'framer-motion'
import { spring } from '../lib/motion.js'
import { haptics } from '../lib/haptics.js'

const ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['⌫','0','.']]

export default function Keypad({ onKey }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
      {ROWS.flat().map((k) => (
        <motion.button
          key={k}
          whileTap={{ scale: 0.91 }}
          transition={spring.snappy}
          onClick={() => { haptics.light(); onKey(k) }}
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            height: 43,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: k === '⌫' || k === '.' ? 17 : 20,
            fontWeight: 500,
            color: k === '⌫' ? 'var(--subtle)' : k === '.' ? 'var(--muted)' : 'var(--text)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
          }}
        >
          {k}
        </motion.button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/components/Keypad.jsx
git commit -m "feat: custom number keypad with spring press animation and haptics"
```

---

### Task 20: Category Predictor + Tests

**Files:**
- Create: `src/lib/categoryPredictor.js`
- Create: `src/lib/categoryPredictor.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/categoryPredictor.test.js
import { describe, it, expect } from 'vitest'
import { predictCategory } from './categoryPredictor.js'

const now = new Date('2026-06-19T12:00:00')
const recent = (daysAgo) => new Date(now.getTime() - daysAgo * 86400000)

describe('predictCategory', () => {
  it('returns null for empty/null merchantName', () => {
    expect(predictCategory([], '', now)).toBeNull()
    expect(predictCategory([], null, now)).toBeNull()
    expect(predictCategory([], '   ', now)).toBeNull()
  })

  it('returns null when no matching history', () => {
    const e = [{ merchantName: 'Walmart', categoryId: 'groceries', date: recent(1) }]
    expect(predictCategory(e, 'Chipotle', now)).toBeNull()
  })

  it('returns null when fewer than 2 matches', () => {
    const e = [{ merchantName: 'Chipotle', categoryId: 'food', date: recent(1) }]
    expect(predictCategory(e, 'Chipotle', now)).toBeNull()
  })

  it('returns most common categoryId', () => {
    const e = [
      { merchantName: 'Chipotle', categoryId: 'food', date: recent(1) },
      { merchantName: 'Chipotle', categoryId: 'food', date: recent(2) },
      { merchantName: 'Chipotle', categoryId: 'entertainment', date: recent(3) },
    ]
    expect(predictCategory(e, 'Chipotle', now)).toBe('food')
  })

  it('ignores expenses older than 60 days', () => {
    const e = [
      { merchantName: 'Chipotle', categoryId: 'food', date: recent(61) },
      { merchantName: 'Chipotle', categoryId: 'food', date: recent(62) },
    ]
    expect(predictCategory(e, 'Chipotle', now)).toBeNull()
  })

  it('is case-insensitive', () => {
    const e = [
      { merchantName: 'chipotle', categoryId: 'food', date: recent(1) },
      { merchantName: 'CHIPOTLE', categoryId: 'food', date: recent(2) },
    ]
    expect(predictCategory(e, 'Chipotle', now)).toBe('food')
  })

  it('ignores expenses with no merchantName', () => {
    const e = [
      { merchantName: null, categoryId: 'food', date: recent(1) },
      { merchantName: '', categoryId: 'food', date: recent(2) },
    ]
    expect(predictCategory(e, 'Chipotle', now)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect failure**
```bash
npm test -- categoryPredictor
```

- [ ] **Step 3: Implement**

```js
// src/lib/categoryPredictor.js
function toMs(date) {
  if (!date) return 0
  if (date.toDate) return date.toDate().getTime()
  return new Date(date).getTime()
}

export function predictCategory(expenses, merchantName, now = new Date()) {
  if (!merchantName || !merchantName.trim()) return null

  const cutoff = now.getTime() - 60 * 86400000
  const needle = merchantName.toLowerCase()
  const counts = {}

  for (const e of expenses) {
    if (!e.merchantName) continue
    if (toMs(e.date) < cutoff) continue
    const hay = e.merchantName.toLowerCase()
    if (!hay.includes(needle) && !needle.includes(hay)) continue
    counts[e.categoryId] = (counts[e.categoryId] ?? 0) + 1
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!entries.length || entries[0][1] < 2) return null
  return entries[0][0]
}
```

- [ ] **Step 4: Run tests — expect pass**
```bash
npm test -- categoryPredictor
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**
```bash
git add src/lib/categoryPredictor.js src/lib/categoryPredictor.test.js
git commit -m "feat: category predictor from merchant name history"
```

---

### Task 21: LogPage Full Layout Rewrite

**Files:**
- Modify: `src/pages/LogPage.jsx`

The LogPage gets a complete layout restructure:
- Custom Keypad replaces AmountInput (no OS keyboard for amount)
- Date chip always visible alongside Personal/½ Split
- All 10 categories always visible in a 5×2 grid (no scroll)
- "Add details" collapsible row for note + repeat only
- Framer Motion spring on the details expand
- Auto-suggest category from merchant prefill history

- [ ] **Step 1: Replace LogPage.jsx entirely**

```jsx
// src/pages/LogPage.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { normalizeAmount, validateAmount, splitInHalf } from '../lib/expense.js'
import { addExpense } from '../lib/expenseStore.js'
import { addRecurring } from '../lib/recurringStore.js'
import { monthKey } from '../lib/recurring.js'
import { predictCategory } from '../lib/categoryPredictor.js'
import { haptics } from '../lib/haptics.js'
import { spring } from '../lib/motion.js'
import { CATEGORIES } from '../lib/categories.js'
import CategoryGrid from '../components/CategoryGrid.jsx'
import Keypad from '../components/Keypad.jsx'
import { motion, AnimatePresence } from 'framer-motion'

function formatDateChip(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function LogPage() {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { expenses } = useExpenses()
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const prefill = {
    prefillAmount: location.state?.prefillAmount ?? (params.get('amount') ? Number(params.get('amount')) : undefined),
    prefillCategoryId: location.state?.prefillCategoryId ?? params.get('categoryId') ?? undefined,
    prefillSplit: location.state?.prefillSplit ?? false,
    pendingId: location.state?.pendingId ?? params.get('pendingId') ?? undefined,
    prefillDate: location.state?.prefillDate ?? params.get('date') ?? undefined,
    prefillMerchantName: location.state?.prefillMerchantName ?? params.get('merchantName') ?? undefined,
    prefillType: location.state?.prefillType ?? params.get('entryType') ?? undefined,
  }

  const [amountText, setAmountText] = useState(
    prefill.prefillAmount != null ? String(prefill.prefillAmount) : ''
  )
  const [type, setType] = useState(prefill.prefillType === 'income' ? 'income' : 'expense')
  const [poolType, setPoolType] = useState(prefill.prefillSplit ? 'split' : 'personal')
  const [dateStr, setDateStr] = useState(prefill.prefillDate ?? new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [merchantName] = useState(prefill.prefillMerchantName ?? '')
  const [repeatMonthly, setRepeatMonthly] = useState(false)
  const [repeatDay, setRepeatDay] = useState(() => Number(dateStr.slice(8, 10)) || new Date().getDate())
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const dateInputRef = useRef(null)

  // Auto-suggest category from merchant history
  const suggestedCategoryId = merchantName ? predictCategory(expenses, merchantName) : null
  const [categoryId, setCategoryId] = useState(
    prefill.prefillCategoryId ?? suggestedCategoryId ?? null
  )

  // If suggestion loads after mount (expenses may not be ready), apply it once
  useEffect(() => {
    if (!categoryId && suggestedCategoryId) setCategoryId(suggestedCategoryId)
  }, [suggestedCategoryId])

  const amount = normalizeAmount(amountText)
  const canSave = validateAmount(amount) && (type === 'income' || categoryId) && !saving

  function handleKey(k) {
    if (k === '⌫') { setAmountText((prev) => prev.slice(0, -1)); return }
    if (k === '.') {
      if (amountText.includes('.')) return
      setAmountText((prev) => (prev === '' ? '0.' : prev + '.'))
      return
    }
    // Max 2 decimal places
    const dotIdx = amountText.indexOf('.')
    if (dotIdx !== -1 && amountText.length - dotIdx > 2) return
    setAmountText((prev) => prev + k)
  }

  function handleTypeChange(next) {
    setType(next)
    if (next === 'income') setPoolType('personal')
    haptics.light()
  }

  function handlePoolToggle(p) {
    if (p === 'split' && validateAmount(amount)) {
      setAmountText(String(splitInHalf(amount)))
    } else if (p === 'personal' && poolType === 'split') {
      setAmountText(String(amount * 2))
    }
    setPoolType(p)
    haptics.light()
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await addExpense({
        uid: user.uid, householdId, amount,
        categoryId: type === 'income' ? 'other' : categoryId,
        type, poolType: type === 'income' ? 'personal' : poolType,
        note, merchantName,
        date: new Date(dateStr + 'T12:00:00'),
      })
      if (repeatMonthly) {
        await addRecurring({
          uid: user.uid, householdId, amount,
          categoryId: type === 'income' ? 'other' : categoryId,
          type, poolType: type === 'income' ? 'personal' : poolType,
          note, merchantName,
          dayOfMonth: Math.min(Math.max(Number(repeatDay) || 1, 1), 31),
          splitRatio: 0.5,
          lastPostedMonth: monthKey(new Date()),
        })
      }
      if (prefill.pendingId) {
        await deleteDoc(doc(db, 'pendingTransactions', prefill.pendingId)).catch(() => {})
      }
      haptics.success()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Failed to save', err)
      setSaving(false)
    }
  }

  const displayAmount = amountText === '' ? '0' : amountText

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh',
      background: 'var(--bg)', overflow: 'hidden',
    }}>
      {/* TOP: all controls, no scroll */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        padding: '14px 14px 10px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>

        {merchantName && (
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--subtle)', textAlign: 'center' }}>
            From <strong style={{ color: 'var(--muted)' }}>{merchantName}</strong>
          </p>
        )}

        {/* Expense / Income toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--surface)', borderRadius: 11, padding: 3, alignSelf: 'center' }}>
          {['expense', 'income'].map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              style={{
                padding: '5px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 600, textTransform: 'capitalize', fontSize: 'var(--text-sm)',
                background: type === t ? (t === 'income' ? 'var(--accent)' : 'var(--surface-2)') : 'transparent',
                color: 'var(--text)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Amount display */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: -3, lineHeight: 1, color: '#fff' }}>
            ${displayAmount}<span style={{ opacity: .35 }}>|</span>
          </div>
          {merchantName && suggestedCategoryId && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
              🧠 Looks like {CATEGORIES.find((c) => c.id === suggestedCategoryId)?.label}
            </div>
          )}
        </div>

        {/* Personal / Split + Date chip in one row */}
        {type === 'expense' && (
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {['personal', 'split'].map((p) => (
              <button
                key={p}
                onClick={() => handlePoolToggle(p)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 10, border: '1px solid var(--border)',
                  cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize', fontSize: 'var(--text-sm)',
                  background: poolType === p ? 'rgba(16,185,129,.15)' : 'var(--surface)',
                  color: poolType === p ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {p === 'split' ? '½ Split' : 'Personal'}
              </button>
            ))}
            {/* Date chip — always visible */}
            <button
              onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--surface)', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 10, padding: '7px 11px', fontSize: 'var(--text-sm)', fontWeight: 600,
                color: 'var(--muted)', whiteSpace: 'nowrap', cursor: 'pointer',
              }}
            >
              📅 {formatDateChip(dateStr)}
            </button>
            {/* Hidden native date input */}
            <input
              ref={dateInputRef}
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
            />
          </div>
        )}

        {/* Category grid — 5×2, all 10 visible */}
        {type === 'expense' && (
          <div>
            <p style={{ margin: '0 0 7px', fontSize: 'var(--text-xs)', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
              Category
            </p>
            <CategoryGrid selected={categoryId} onSelect={(id) => { setCategoryId(id); haptics.light() }} />
          </div>
        )}

        {/* Add details — collapsible (note + repeat only) */}
        <button
          onClick={() => { setShowDetails((v) => !v); haptics.light() }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '9px 13px', cursor: 'pointer', width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-sm)', color: 'var(--muted)', fontWeight: 500 }}>
            <span>📋</span>
            <span>Add details</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--subtle)' }}>note · repeat monthly</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--subtle)', transform: showDetails ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.smooth}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  style={fieldStyle}
                />
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={repeatMonthly}
                      onChange={(e) => setRepeatMonthly(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
                      Repeat every month
                    </span>
                  </label>
                  {repeatMonthly && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem' }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>On day</span>
                      <input
                        type="number" min={1} max={31} value={repeatDay}
                        onChange={(e) => setRepeatDay(e.target.value)}
                        style={{ width: 64, padding: '0.4rem 0.5rem', borderRadius: 8, textAlign: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                      />
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>of each month</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* BOTTOM: keypad + save, always pinned */}
      <div style={{
        flexShrink: 0, padding: '8px 14px',
        paddingBottom: 'calc(8px + var(--safe-bottom))',
        background: '#141414', borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 7,
      }}>
        <Keypad onKey={handleKey} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => navigate('/', { replace: true })}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleSave}
            disabled={!canSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

const fieldStyle = {
  width: '100%', padding: '0.75rem', borderRadius: 10,
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
  fontSize: 'var(--text-base)',
}
```

**Note:** `CategoryGrid` is used unchanged. Verify it renders a 5×2 grid internally — if it uses a horizontal scroll, that needs to be changed in `CategoryGrid.jsx`. Read that file first; if it uses `display: flex; overflow-x: auto`, change it to `display: grid; grid-template-columns: repeat(5, 1fr)`.

- [ ] **Step 2: Check CategoryGrid and fix if needed**

Read `src/components/CategoryGrid.jsx`. If it uses `overflow-x: auto` or a horizontal layout, update it to:
```jsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open Log. Confirm:
- All 10 category icons are visible in a 5×2 grid without any scrolling
- Date chip shows today's date and is tappable (opens native date picker)
- Typing on the custom keypad updates the amount display
- "Add details" row expands/collapses with spring animation
- Category suggestion hint appears when navigating from a Plaid notification with a known merchant
- Save works correctly and navigates home

- [ ] **Step 4: Commit**
```bash
git add src/pages/LogPage.jsx src/components/CategoryGrid.jsx
git commit -m "feat: log page rewrite — custom keypad, date chip, 5x2 category grid, auto-suggest"
```

---

## Phase 4 — Insights

---

### Task 22: Fix Percentage Display + Animated Bars

**Files:**
- Modify: `src/pages/InsightsPage.jsx`

Currently percentages display to 4 decimal places (`fmtPct` function). Fix to 1 decimal max. Also animate bar heights from 0 on mount/change.

- [ ] **Step 1: Fix the percentage format function**

Find in `src/pages/InsightsPage.jsx`:
```js
function fmtPct(pct) {
  return `${(pct * 100).toFixed(4)}%`
}
```
Replace with:
```js
function fmtPct(pct) {
  const val = pct * 100
  return val < 1 ? `${val.toFixed(1)}%` : `${Math.round(val)}%`
}
```

- [ ] **Step 2: Add framer-motion imports**

Add to the top of `src/pages/InsightsPage.jsx`:
```js
import { motion } from 'framer-motion'
import { spring } from '../lib/motion.js'
```

- [ ] **Step 3: Animate bar heights**

Find the bar div inside the `months.map()`:
```jsx
<div
  style={{
    width: '100%', maxWidth: 34, borderRadius: '6px 6px 2px 2px',
    height: `${Math.max(h, m.total > 0 ? 4 : 1)}%`,
    background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
    transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1), background 0.15s',
  }}
/>
```

Replace with a `motion.div`:
```jsx
<motion.div
  initial={{ height: 0 }}
  animate={{
    height: `${Math.max(h, m.total > 0 ? 4 : 1)}%`,
    background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
  }}
  transition={{ ...spring.gentle, delay: months.indexOf(m) * 0.04 }}
  style={{ width: '100%', maxWidth: 34, borderRadius: '6px 6px 2px 2px' }}
/>
```

- [ ] **Step 4: Animate category breakdown bars**

Find the category breakdown bar fill div:
```jsx
<div style={{ height: '100%', width: `${Math.round(b.pct * 100)}%`, background: cat.color, borderRadius: 3, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)' }} />
```

Replace with:
```jsx
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${Math.round(b.pct * 100)}%` }}
  transition={spring.gentle}
  style={{ height: '100%', background: cat.color, borderRadius: 3 }}
/>
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Open Insights. Bar chart bars should animate from 0 on mount, staggered by index. Category percentages should display as "36%" or "2.4%", not "36.0000%".

- [ ] **Step 6: Commit**
```bash
git add src/pages/InsightsPage.jsx
git commit -m "fix: insights percentage display; feat: animate bar chart heights with stagger"
```

---

### Task 23: Swipe Between Months on Insights

**Files:**
- Modify: `src/pages/InsightsPage.jsx`

Swipe left/right on the bar chart card to change months. The ‹ › buttons remain as accessible fallback.

- [ ] **Step 1: Wrap the bar chart card in a drag handler**

Import `useRef` if not already imported, then find the bar chart `<div className="card">` block and wrap its content's outer div in a `motion.div`:

```jsx
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
  style={{ cursor: 'grab', touchAction: 'pan-y' }}
>
  {/* existing bar chart inner JSX */}
</motion.div>
```

Wrap only the bar chart card contents (the `<div style={{ display: 'flex', alignItems: 'flex-end'...}}>` bar area), not the navigation buttons — those remain tappable.

- [ ] **Step 2: Add swipe hint text**

Below the nav buttons row and above the bar area, add:
```jsx
<p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--subtle)', margin: '0 0 8px', letterSpacing: '.04em' }}>
  ← swipe to change month →
</p>
```

This can be hidden after first swipe via a `useState` if desired, but static is acceptable.

- [ ] **Step 3: Animate month transitions**

Wrap the bar chart area with `AnimatePresence` and key by `anchorKey` so bars re-animate when the month changes:

```jsx
<AnimatePresence mode="wait">
  <motion.div
    key={anchorKey}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={spring.smooth}
  >
    {/* bar chart rows */}
  </motion.div>
</AnimatePresence>
```

Add `AnimatePresence` to imports at the top.

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Open Insights. Swipe the chart left — should advance to the next month (bars re-animate). Swipe right — should go back. Tapping ‹ › still works.

- [ ] **Step 5: Commit**
```bash
git add src/pages/InsightsPage.jsx
git commit -m "feat: swipe left/right on insights chart to change months"
```

---

## Phase 5 — Settings + Global Polish

---

### Task 24: SettingsPage Restyle

**Files:**
- Modify: `src/pages/SettingsPage.jsx`

Settings is already well-structured (`Section`, `Row`, `LastRow`). This task applies consistent tokens and ensures `PageWrapper` is in place (already done in Task 9).

- [ ] **Step 1: Replace `page-center` with `page-root` and tighten spacing**

In `src/pages/SettingsPage.jsx`, find:
```jsx
<div className="page-center" style={{ justifyContent: 'flex-start', gap: '1.5rem' }}>
```
Replace with (PageWrapper already handles this from Task 9, but if not yet done for Settings):
```jsx
<PageWrapper className="page-root" style={{ gap: '1.5rem' }}>
```

- [ ] **Step 2: Update heading to use design tokens**

Find:
```jsx
<h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h2>
```
Replace with:
```jsx
<h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h2>
```

- [ ] **Step 3: Update Section/Row components to use radius token**

In the `Section` function, update `.card` override if any hardcoded radius values exist. In `Row` and `LastRow`, update `padding` to use slightly more generous spacing:

```jsx
function Row({ children, style }) {
  return (
    <div style={{ padding: '0.875rem 1.125rem', borderBottom: '1px solid var(--border)', ...style }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Settings page should look visually consistent with Home and Expenses — same card radius, spacing, and text sizing.

- [ ] **Step 5: Commit**
```bash
git add src/pages/SettingsPage.jsx
git commit -m "refactor: settings page uses design tokens for consistent visual language"
```

---

### Task 25: Final Haptics Pass

**Files:**
- Modify: `src/pages/ExpensesPage.jsx`
- Modify: `src/components/BottomNav.jsx`

Wire haptics to all remaining key interactions.

- [ ] **Step 1: Add haptics to ExpensesPage bulk delete**

In `src/pages/ExpensesPage.jsx`, import haptics and fire on select mode toggle and bulk delete confirmation:

```js
import { haptics } from '../lib/haptics.js'
```

In the `deleteSelected` function, add `haptics.warning()` just before the `window.confirm` call:
```js
const deleteSelected = useCallback(async () => {
  const ids = [...selected]
  if (ids.length === 0) return
  haptics.warning()
  if (!window.confirm(`Delete ${ids.length} expense${ids.length > 1 ? 's' : ''}? This can't be undone.`)) return
  for (const id of ids) await deleteExpense({ id })
  exitSelect()
}, [selected, exitSelect])
```

- [ ] **Step 2: Add haptics to BottomNav tab taps**

In `src/components/BottomNav.jsx`, import haptics and add `onClick={() => haptics.light()}` to each `NavLink` and the Log FAB:

```jsx
import { haptics } from '../lib/haptics.js'

// On each NavLink:
<NavLink ... onClick={() => haptics.light()}>
```

- [ ] **Step 3: Verify in browser on a device with vibration**

Tap through the app on a physical Android device or Chrome with vibration support. Each key action (tap nav tab, save expense, delete expense, swipe commit) should have a distinct haptic feel.

- [ ] **Step 4: Commit**
```bash
git add src/pages/ExpensesPage.jsx src/components/BottomNav.jsx
git commit -m "feat: complete haptics pass — nav taps, bulk delete, all key interactions"
```

---

## Self-Review Checklist (spec coverage)

| Spec requirement | Task(s) |
|---|---|
| Framer Motion dependency | Task 1 |
| Design tokens in CSS | Task 2 |
| Motion spring presets | Task 3 |
| Haptics util | Task 4 |
| Skeleton shimmer | Tasks 5, 14 |
| EmptyState | Tasks 6, 14, 17 |
| AnimatedNumber | Tasks 7, 17 |
| Sheet (drag-to-dismiss, Android dvh fix) | Tasks 8, 13 |
| MotionConfig + AnimatePresence page transitions | Task 9 |
| PageWrapper per-page animation | Task 9 |
| leftToSpend calculation | Task 10 |
| Tap to expand notes | Task 11 |
| Swipe left=delete, right=edit | Task 12 |
| EditExpenseModal Android fix | Task 13 |
| Skeleton loading on Expenses | Task 14 |
| Animated ProgressBar | Task 15 |
| Quick-log chip logic | Task 16 |
| Home hero card + AnimatedNumber | Task 17 |
| Quick-log chips on Home | Task 18 |
| Pull to refresh | Task 18 |
| Custom Keypad | Task 19 |
| Category predictor | Task 20 |
| Log layout (keypad pinned, categories 5×2, date chip, Add details expand) | Task 21 |
| CategoryGrid fix (no scroll) | Task 21 |
| Auto-suggest category | Task 21 |
| Fix Insights % display | Task 22 |
| Animated Insights bars (staggered) | Task 22 |
| Swipe between months on Insights | Task 23 |
| Settings restyle | Task 24 |
| Full haptics pass | Tasks 4, 12, 18, 19, 21, 25 |
