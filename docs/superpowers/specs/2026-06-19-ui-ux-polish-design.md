# DollarSmart UI/UX Polish — Design Spec
_2026-06-19_

## North Star

**Crisp + Insightful (B×C):** A premium, engineered dark UI — sharp type, tight grid, restrained color, dynamic viewport handling — layered with data-forward surfaces: visible charts, color-coded category breakdowns, and a glanceable spending hero. Powered by Framer Motion for buttery spring physics and native-feeling gestures. No new features; a smarter, smoother version of everything that already exists.

---

## Scope

- **In:** All five screens (Home, Expenses, Log, Insights, Settings), shared foundation, Framer Motion gestures and transitions, haptics, skeletons/empty states, Android edit-sheet bug fix.
- **Out:** No data-model changes, no new Firebase collections, no backend work. "Smart" suggestions use existing expense history only.
- **Dependency:** Add `framer-motion` as the only new package.

---

## Foundation (Phase 0)

Shared infrastructure everything else builds on. Landed first so every phase can use it.

### Design Tokens (CSS)
Extend `src/App.css` `:root` with:
- **Type scale:** `--text-xs` through `--text-2xl`, letter-spacing tokens (`--tracking-tight`, `--tracking-wide`)
- **Radius scale:** `--radius-sm` (8px) · `--radius-md` (12px) · `--radius-lg` (16px) · `--radius-xl` (20px)
- **Elevation:** `--shadow-card`, `--shadow-sheet`, `--shadow-fab`
- **Motion:** `--duration-fast` (120ms) · `--duration-base` (220ms) · `--duration-slow` (380ms)
- **Viewport:** `--nav-h` already exists; add `--safe-bottom: env(safe-area-inset-bottom, 0px)`

### Framer Motion Setup
- Install: `npm install framer-motion`
- Wrap `<App>` in `<MotionConfig reducedMotion="user">` — automatically respects `prefers-reduced-motion`
- Define spring presets in `src/lib/motion.js`:
  ```js
  export const spring = {
    snappy:  { type: 'spring', stiffness: 400, damping: 30 },
    smooth:  { type: 'spring', stiffness: 260, damping: 28 },
    gentle:  { type: 'spring', stiffness: 180, damping: 24 },
    swipe:   { type: 'spring', stiffness: 500, damping: 40 },
  }
  export const fade = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } }
  ```
- `AnimatePresence` + `motion.div` tab transitions in `App.jsx` — directional slide (left/right) keyed by route.

### Haptics Util
`src/lib/haptics.js` — thin wrapper around `navigator.vibrate`:
```js
export const haptics = {
  light:   () => navigator.vibrate?.(8),
  medium:  () => navigator.vibrate?.(18),
  success: () => navigator.vibrate?.([10, 40, 10]),
  warning: () => navigator.vibrate?.(30),
}
```
Called on: save, delete, swipe-commit, toggle, quick-log tap.

### Shared Primitives (`src/components/ui/`)
Small, targeted — only built where they eliminate significant repetition:
- **`Skeleton.jsx`** — shimmer placeholder block; accepts `width`, `height`, `borderRadius`
- **`EmptyState.jsx`** — icon + heading + subtext; used on Expenses and Home when no data
- **`AnimatedNumber.jsx`** — count-up animation using Framer Motion's `useMotionValue` + `animate`; used in Home hero
- **`Sheet.jsx`** — drag-to-dismiss bottom sheet with backdrop; replaces the inline modal style in `EditExpenseModal`

---

## Phase 1 — Expenses + Edit Sheet

### Swipe-to-Act on Expense Rows (`ExpenseCard.jsx`)
- Use `motion.div` with `drag="x"` and `dragConstraints={{ left: -80, right: 80 }}`
- Left swipe (< −60px velocity threshold) → **Delete** revealed (red, 🗑): triggers existing `onDelete`, fires `haptics.warning()`
- Right swipe (> +60px) → **Edit** revealed (blue, ✎): opens edit modal, fires `haptics.light()`
- Action labels revealed behind the card as it drags; snap back with `spring.swipe` if not committed
- On commit: card animates out with `x: -400` + `opacity: 0`, undo toast appears as before
- The tiny ✎ and × buttons remain for non-touch / accessibility; hidden visually behind the swipe affordance hint (faint arrow on first use only)

### Expandable Notes (`ExpenseCard.jsx`)
- Notes longer than ~50 chars truncate with `…` and show a **"▾ more"** tappable label in accent color
- On tap: note expands to full text with a smooth `height` animation (`AnimatePresence` + `motion.div` with `initial={{ height: 0 }}`)
- Second tap collapses back
- State is local to each card (`useState(false)`)

### Fix Android Edit Sheet (`EditExpenseModal.jsx` → `Sheet.jsx`)
The root cause: `max-height: 90vh` on Android Chrome measures height behind the address bar, pushing the Save button off-screen.

**Fix:**
- Replace `max-height: 90vh` with `max-height: 90dvh` (dynamic viewport height — always the visible area)
- Extract sheet into `Sheet.jsx` using Framer Motion drag for pull-to-dismiss
- **Pin the action row** (Cancel + Save) with `position: sticky; bottom: 0` inside the sheet, with its own `padding-bottom: env(safe-area-inset-bottom, 0px)` — Save is always reachable regardless of keyboard state
- Sheet content area gets `overflow-y: auto` so it scrolls independently of the pinned buttons

### Skeleton Loading + Empty States
- `ExpensesPage.jsx`: while `loading === true`, render 5 `<Skeleton>` rows at expense card height
- When `visible.length === 0` after load: render `<EmptyState icon="🧾" heading="No expenses here" sub="Try adjusting your filters" />`

---

## Phase 2 — Home

### Glanceable Hero Card
Replaces the plain header. Flat dark card (`var(--surface)`, no tint).

**Calculation:** `leftToSpend = Σ(personalTargets[cat]) − Σ(spent in targeted cats this month)`. Hidden entirely when user has set zero targets (show friendly prompt to set targets instead).

**Contents:**
- Small label: "Left to spend" (`var(--subtle)`)
- Giant white number: `<AnimatedNumber value={leftToSpend} />` — animates on mount and when month changes
- Inline total: `/ $4,000` in muted text next to the number
- Badge row: `✓ On pace` (green) + `$XX/day · N days left` (muted) — pace = leftToSpend ÷ daysRemaining vs. expected daily rate
- Progress bar: `leftToSpend / totalTarget` — green when on track, amber at <20% remaining, red when over
- When over budget: number turns `var(--danger)`, badge shows `⚠ Over budget`

### Quick-Log Chips
Below the hero, above budget bars. Label: "Quick log".

**Logic (no new storage):** Scan last 90 days of personal expenses, group by `categoryId + Math.round(amount)`, take top 3 by frequency. Each chip shows `{cat.emoji} {cat.label} ${amount}`.

**On tap:** navigate to `/log` with `state: { prefillAmount, prefillCategoryId }` + fire `haptics.light()`. The existing prefill system in `LogPage` handles the rest — zero new wiring needed.

**Empty:** chips section hidden until ≥3 distinct recent expenses exist.

### Animated Budget Bars
- `ProgressBar.jsx`: wrap fill div in `motion.div`, animate `width` from 0 → target on mount with `spring.gentle`
- Over-budget bar: fill clamps at 100% and pulses red (`animate={{ opacity: [1, 0.6, 1] }}` on a loop)

### Pull to Refresh
- Wrap `HomePage` scroll area in a `motion.div` tracking `y` drag
- When pulled > 60px and released: trigger a Firestore refresh, show a spinner, snap back
- Spring-elastic pull feel via `dragElastic: 0.4`

---

## Phase 3 — Log

### Layout (always-visible, no scroll)
Fixed flex column: top section (`flex: 1`) holds all controls; bottom section (`flex-shrink: 0`) holds keypad + Save. `min-height: 0` on top so flex doesn't overflow.

**Top section, top to bottom:**
1. Expense / Income toggle (centered pill)
2. Amount display — 48px light-weight number, cursor blink, smart suggestion hint below in accent color
3. Meta row — `Personal` · `½ Split` pills + `📅 Jun 19` date chip (all in one flex row)
4. Category label + 5×2 grid (all 10 categories, no scroll)
5. "Add details" collapsible row (chevron ›) — expands inline to show note input + repeat-monthly toggle

**Bottom section (pinned):**
- 4×3 custom keypad (keys: 43px height, 11px border-radius)
- Cancel + Save row (Save is `flex: 2`, accent green, disabled-state dimmed)

### Custom Number Keypad
- Replace OS keyboard on the amount field: `inputMode="none"` on the amount input, render keypad manually
- Keys: 1–9, backspace (⌫), 0, `.`
- Key press: `haptics.light()` + `spring.snappy` scale press animation (`whileTap={{ scale: 0.92 }}`)
- Backspace held: repeat-delete after 500ms

### Date Chip
- Shows today's date by default: "📅 Jun 19"
- Tap opens a native `<input type="date">` via a hidden ref (`.click()`) — reuses the OS date picker, no custom calendar needed
- On change: chip updates to new date, highlighted with accent border briefly

### Auto-Suggest Category
- On mount and when `merchantName` prefill exists: scan last 60 days of expenses for the same merchant, take the most common `categoryId`
- Show hint below amount: "🧠 Looks like {cat.label} · {merchant}"
- Pre-select that category (user can override by tapping another)
- No hint shown if merchant is unknown or history is ambiguous (< 2 matches)

### "Add Details" Expansion
- Animated height expand/collapse (`AnimatePresence` + `motion.div`)
- Reveals: note text input + repeat-monthly checkbox + day-of-month input (existing logic, just moved here)

---

## Phase 4 — Insights

### Swipe Between Months
- Wrap bar chart card in `motion.div` with `drag="x"` and `dragConstraints={{ left: 0, right: 0 }}`
- On swipe commit (velocity > 300): call existing `step(-1)` or `step(1)`, animate bars out left/right and new bars in
- ‹ › buttons remain as accessible fallback (still visible, just smaller)
- Subtle "← swipe →" hint text below the chart, fades after first swipe

### Bar Chart Polish
- Each bar: `motion.div` animating `height` from 0 on mount, staggered by index (`delay: i * 0.04`)
- Selected bar: accent green with a soft glow (`box-shadow: 0 0 12px rgba(16,185,129,.35)`)
- Amount label above each bar fades in after bar animates up

### Donut + Category Breakdown
- Percentages: display as `X%` (1 decimal max, e.g. `36.4%`) — fix the current 4-decimal bug
- Donut: `conic-gradient` as today, but animate in by wrapping in a `motion.div` that clips with a rotating mask on mount
- Legend: show top 4 categories (as now), but make each row tappable to highlight that category's bar

---

## Phase 5 — Settings + Global Polish

### Settings Restyle
- Apply the same card/surface/spacing tokens for visual consistency
- Section headers use the existing `.section-label` pattern, just with proper spacing tokens
- No structural changes to settings content

### Tab Transitions
In `App.jsx`, detect nav direction (tab index left/right) and pass as context. Each page root animates:
```js
// entering from right
initial: { x: 30, opacity: 0 }
animate: { x: 0, opacity: 1 }
exit:    { x: -20, opacity: 0 }
```
Transition: `spring.smooth`. Pages that share data (Home ↔ Expenses) feel connected.

### Final Haptics Pass
Audit every meaningful interaction and ensure `haptics.*` is wired:
- Save expense → `haptics.success()`
- Delete expense → `haptics.warning()`
- Swipe commit → `haptics.medium()`
- Toggle pool type / expense type → `haptics.light()`
- Quick-log chip tap → `haptics.light()`
- Budget bar over limit → `haptics.warning()` (once per session, not on every render)

---

## What Is Not Changing

- Firebase data model, collections, hooks — untouched
- Route structure (`/`, `/log`, `/expenses`, `/insights`, `/settings`)
- Auth / Household / Plaid / Notification flows
- Existing `CATEGORIES` list
- Color palette (accent `#10B981`, warn `#F59E0B`, danger `#F87171`, bg `#191919`)

---

## Delivery Phases

| Phase | Key files touched | Shippable alone? |
|---|---|---|
| 0 · Foundation | `App.jsx`, `App.css`, `src/lib/motion.js`, `src/lib/haptics.js`, `src/components/ui/` | Yes (invisible) |
| 1 · Expenses + Edit | `ExpenseCard.jsx`, `EditExpenseModal.jsx`, `ExpensesPage.jsx` | Yes |
| 2 · Home | `HomePage.jsx`, `ProgressBar.jsx` | Yes |
| 3 · Log | `LogPage.jsx`, new `Keypad.jsx` | Yes |
| 4 · Insights | `InsightsPage.jsx` | Yes |
| 5 · Settings + global | `SettingsPage.jsx`, `App.jsx`, `BottomNav.jsx` | Yes |
