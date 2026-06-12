# DollarSmart — Design Spec
**Date:** 2026-06-12  
**Status:** Approved  
**Users:** Alex (Android) + girlfriend (iPhone, PNC bank, ADHD)

---

## Overview

DollarSmart is a couples personal finance PWA for exactly two people. It tracks shared and personal expenses, syncs in real-time, and uses Plaid bank integration to detect transactions and prompt logging. Designed for low friction and ADHD-friendly UX — the primary goal is an app that actually gets opened and used daily.

---

## 1. Architecture

### Stack
- **Frontend:** React + Vite, configured as a PWA (service worker, manifest, installable)
- **Database:** Firebase Firestore (real-time sync)
- **Auth:** Firebase Auth — Google Sign-In only, no passwords
- **Push notifications:** Firebase Cloud Messaging (FCM) — works on Android natively, on iPhone via PWA installed to Home Screen (iOS 16.4+)
- **Bank integration:** Plaid (transaction webhooks → Firebase Cloud Function → FCM push)
- **Hosting:** Vercel (free tier)
- **Backend logic:** Firebase Cloud Functions (Node.js)

### Firestore Data Model
```
/users/{uid}
  - displayName, photoURL
  - householdId
  - notificationPrefs: { transactionAlert, dailyNudge, nudgeTime, partnerActivity, approachingTarget }
  - monthlyTargets: { [categoryId]: number }
  - fcmToken

/households/{householdId}
  - memberUids: [uid1, uid2]
  - inviteCode: string (6-char alphanumeric)
  - inviteExpiresAt: timestamp
  - inviteUsed: boolean
  - sharedTargets: { [categoryId]: number }

/expenses/{expenseId}
  - amount: number
  - categoryId: string
  - note: string (optional)
  - date: timestamp
  - uid: string (who logged it)
  - householdId: string
  - poolType: "personal" | "shared" | "split"
  - splitRatio: number (default 0.5, only for "split")
  - plaidMerchant: string (optional, from Plaid webhook)
  - reactions: { [uid]: emoji }
```

### Household Group
- One user creates a household group → receives a 6-character alphanumeric invite code
- Code is single-use and expires after 24 hours
- Second user enters the code to join — both are now linked permanently
- After joining, invite code is invalidated and deleted

---

## 2. Authentication & Onboarding

1. Google Sign-In (one tap)
2. First-time user: prompted to **Create a household** or **Join with code**
3. Creator gets the 6-char code to share
4. Joiner enters code → both see the shared home screen
5. Both connect their bank accounts via Plaid Link (separate, each user's own flow — credentials never touch our app)
6. Notification permission prompt (one ask, with explanation of value)

---

## 3. Screens & Navigation

**Bottom tab bar (4 tabs):**

### Tab 1 — Home
- Today's spend summary (personal + shared at a glance)
- Shared pool progress bar (current vs. monthly target)
- Logging streak badge
- Floating **Quick Log** button (always visible, highest z-index)
- Swipeable — swipe left/right to navigate between months, chart animates in

### Tab 2 — Log
- **Quick Log** (default): Amount input (large, numeric) → Category tile grid → Save. Three interactions, under 20 seconds.
  - Pool defaults to **Personal** — toggle to Shared available on the same screen (one tap)
  - ÷2 button beside the amount field: taps instantly halves amount and auto-tags as "split" + routes to Shared
  - Manual split: expandable option for custom ratio (e.g. 60/40)
- **Full Log** toggle: expands to add note, date override, explicit personal vs. shared selection
- Pool selector: Personal (private) or Shared (both see it)

### Tab 3 — Expenses
- Chronological feed, most recent first
- Each card shows: amount, category chip (colored), merchant/note, who logged it, pool badge (Personal / Shared / Split), date
- Emoji reaction row under shared/split expenses — tap to react (❤️ 😂 👀 😬 💀)
- Filter bar: by month, category, pool type, or person
- Swipe left on a card to edit; swipe right to delete (with confirm) — only your own expenses are editable/deletable

### Tab 4 — Settings
- Monthly targets per category (personal + shared separately)
- Notification preferences (per-user, opt-in):
  - Transaction alerts (on by default)
  - Daily catch-up nudge + time picker
  - Shared pool approaching target
  - Partner logged a shared expense
- Light / dark mode toggle (dark default)
- Bank connection status + reconnect
- Household group info
- Account / sign out

---

## 4. Categories

| Category | Emoji | Color chip |
|---|---|---|
| Food & Drink | 🍔 | Orange |
| Groceries | 🛒 | Green |
| Transport | 🚗 | Blue |
| Shopping | 🛍️ | Purple |
| Entertainment | 🎮 | Pink |
| Bills & Utilities | 💡 | Yellow |
| Health | 💊 | Teal |
| Travel | ✈️ | Sky blue |
| Pets | 🐾 | Warm brown |
| Other | 📦 | Gray |

Both users can add custom categories in Settings.

---

## 5. Transaction Detection (Plaid → Push Flow)

1. User makes a purchase
2. Bank notifies Plaid (within 30–90 seconds typically)
3. Plaid fires signed webhook → Firebase Cloud Function
4. Cloud Function:
   - Verifies Plaid webhook signature (security requirement #2)
   - Maps merchant name to category
   - Looks up user's FCM token
   - Fires push notification
5. Notification: **"Looks like you spent $24.50 at Chipotle 🍔 — log it?"**
   - Primary action: "Log it" → deep-links to Quick Log with amount + category pre-filled
   - Secondary action: "Split it" → same but ÷2 pre-applied, routes to shared pool
6. User confirms or adjusts → saves

**PNC bank:** Supported via Plaid's official data-sharing agreement. Uses credential-less OAuth (PNC login page, never our app). Token expires after 1 year — app detects and prompts reconnect.

---

## 6. Notification Types

| Type | Trigger | Default |
|---|---|---|
| Transaction detected | Plaid webhook | ON for both |
| Daily catch-up nudge | User-chosen time | Opt-in (her only, suggested) |
| Approaching shared target | Pool hits 80% of monthly target | ON for both |
| Partner logged shared expense | Any shared/split expense saved | Optional |
| Weekly AI insight | Every Sunday | ON for both |

**If notification permission denied:** Settings shows a persistent soft banner — never auto-asks twice.

---

## 7. Visual Design

### Color system
- Background: `#0F172A` (deep slate)
- Cards: `#1E293B`
- Border radius: 16px
- On-track accent: `#10B981` (emerald)
- Approaching limit: `#F59E0B` (amber)
- Over limit: `#F87171` (soft coral — never alarm red)
- Each category has its own color chip, used consistently everywhere

### Typography
- Font: Inter
- 3 sizes only: large numbers (32px), body (16px), caption (12px)

### Motion
- Month swipe: horizontal slide, chart animates in on entry
- Log save: budget bar animates to new position + celebratory pulse (~400ms, ease-out)
- Number changes: count up/down, never snap
- Category tile: slight depress on tap
- Transitions: 200–400ms, ease-out curves

### Themes
- Dark mode default
- Light/dark toggle in Settings, preference saved per user

### Core component set (build once, reuse everywhere)
Button, AmountInput, CategoryTile, ExpenseCard, ProgressBar, Modal, TabBar, StreakBadge, ReactionRow, Toast

---

## 8. Gamification (light)

- **Logging streak:** Day counter for consecutive days with at least one log. Shown on Home as a small badge. Broken streaks restart quietly at "Day 1 🌱" — no shame messaging.
- **Log feedback pulse:** Satisfying animation on every save (see Motion above).
- No leaderboards, no scores, no comparative pressure.

---

## 10. Error Handling & Edge Cases

### Offline
- Quick Log saves to IndexedDB locally first; syncs to Firestore on reconnect
- "Syncing..." pill visible when entries are queued
- Expense feed shows last cached state with "last updated X ago" caption

### Sync conflicts
- Expenses are append-only — no simultaneous edit conflicts for logging
- Monthly target edits: last-write-wins with 500ms debounce

### Plaid token expiry
- PNC tokens expire after 1 year
- App detects stale token via Plaid error code, shows non-blocking banner: "Your bank connection needs a refresh — tap to reconnect"
- Daily nudge acts as fallback if Plaid webhook misses a transaction

### Amount input
- Numeric only, no $0 or negative values accepted
- Comma/period normalized automatically

### Household invite
- Code expires after 24h, single-use
- Expired/used codes generate a new one instantly on request

### Account deletion
- Personal expenses deleted with account
- Shared/split expenses preserved, attributed to "Former member"

---

## 11. Security Requirements (all mandatory, implement from day one)

1. **Firestore security rules:** Users can only read/write their own personal expenses (`uid == request.auth.uid`). Shared/split expenses readable only by members of the same household. Monthly targets writable only by household members.
2. **Plaid webhook signature verification:** Every incoming webhook verified against Plaid's signing secret before processing. Reject unverified requests with 401.
3. **Plaid access tokens server-side only:** Stored in Firebase Cloud Functions environment variables exclusively. Never in client code, never in Firestore client-readable collections, never in git.
4. **Household invite code:** Single-use + 24-hour expiry. Deleted from Firestore immediately after second user joins.
5. **Personal expense privacy:** Firestore rule explicitly enforces `poolType == "personal"` expenses are readable only by the logging user's `uid`.
6. **No secrets in git:** `.env` file for all keys + `.gitignore` entry from project initialization. Firebase config for client uses only public project identifiers (safe by design).

---

## 12. Testing Approach

### Automated
- **Unit tests (Vitest):** Amount splitting, category mapping, streak calculation, budget percentage math
- **Firebase rules tests:** Emulator-based tests confirming personal expense privacy, household read/write rules
- **Cloud Function tests (Jest):** Plaid webhook verification with mocked payloads, notification dispatch

### Manual (pre-launch checklist)
- [ ] Both phones install PWA and receive a test notification
- [ ] Household group invite flow works end-to-end (create → share code → join)
- [ ] Quick Log → Firestore → partner's feed in under 3 seconds
- [ ] ÷2 split routes to shared pool correctly
- [ ] Offline log syncs correctly on reconnect
- [ ] All 6 security rules verified in Firebase emulator
- [ ] PNC Plaid Link OAuth flow completes on iPhone Safari
- [ ] Notification deep-link opens Quick Log with pre-filled amount

---

## 13. Future / Backlog (not in v1)

- **Weekly AI spending insights** — Claude Haiku 4.5 via Anthropic API, runs every Sunday via Firebase scheduled Cloud Function. Input: category spend totals only (no merchant names, privacy-preserving). Output: 2–3 sentence friendly insight pushed as notification + stored in Firestore. Example: "You both spent 40% more on food this week — looks like a fun one. Shared pool is on track. 🌿"
- Remember split preference per merchant
- In-app chat on transactions (Honeydue-style) — emoji reactions cover v1
- Recurring expense tracking
- Net worth / savings goals
- Receipt photo attachment
