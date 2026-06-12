# DollarSmart Phase 2: Auth & Household — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Google Sign-In, a protected app shell with routing, and the full household group flow — create a household (get a 6-char single-use invite code, expires 24h) and join one — so two users can link their accounts.

**Architecture:** Firebase Auth (Google provider) handles identity. A React context (`AuthContext`) exposes the current user throughout the app. React Router v6 handles routing: an `<AuthGate>` wrapper redirects unauthenticated users to `/login`, and a `<HouseholdGate>` redirects authenticated-but-unlinked users to `/onboarding`. Household documents live in Firestore (already security-ruled in Phase 1). Invite code creation/validation is pure client-side Firestore reads/writes — no Cloud Function needed at this phase. Security requirement #4 (single-use + 24h expiry) is enforced on write and validated on join.

**Tech Stack:** React Router v6, Firebase Auth (GoogleAuthProvider), Firestore (existing client from Phase 1), Vitest for unit tests on pure logic (code generation, expiry check).

**Execution:** Tasks 1–2 (routing + auth context) are good fits for Qwen. Tasks 3–5 (household logic, onboarding UI, iPhone PWA guide) have enough correctness requirements that Claude should handle them. Tasks 6–7 (unit tests, iPhone onboarding) are Claude-executed.

---

## File Structure

```
src/
├── main.jsx                          # add BrowserRouter wrapper
├── App.jsx                           # replace shell with route tree
├── contexts/
│   └── AuthContext.jsx               # Firebase Auth state, useAuth hook
├── hooks/
│   └── useHousehold.js               # household Firestore reads, join/create logic
├── lib/
│   └── household.js                  # pure functions: generateCode, isCodeExpired, createHousehold, joinHousehold
├── pages/
│   ├── LoginPage.jsx                 # Google sign-in button, app branding
│   ├── OnboardingPage.jsx            # create household OR join with code
│   └── HomePage.jsx                 # placeholder home (replaced in Phase 3)
├── components/
│   ├── AuthGate.jsx                  # redirects unauthenticated → /login
│   ├── HouseholdGate.jsx             # redirects no-household → /onboarding
│   └── IphoneInstallPrompt.jsx       # "Add to Home Screen" guided prompt (iPhone Safari only)
└── App.css                           # extend with auth/onboarding styles
tests/
└── household.test.js                 # unit tests for pure household logic
```

---

## Task 1: Install React Router and extend App with route tree

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Install React Router**

```bash
npm install react-router-dom
```
Expected: added to `package.json`, no errors.

- [ ] **Step 2: Wrap the app in BrowserRouter in `src/main.jsx`**

Replace the full file:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './firebase/client.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 3: Replace `src/App.jsx` with the route tree**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGate from './components/AuthGate.jsx'
import HouseholdGate from './components/HouseholdGate.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import HomePage from './pages/HomePage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={
          <AuthGate>
            <OnboardingPage />
          </AuthGate>
        }
      />
      <Route
        path="/*"
        element={
          <AuthGate>
            <HouseholdGate>
              <HomePage />
            </HouseholdGate>
          </AuthGate>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 4: Create placeholder page components so the route tree compiles**

Create `src/pages/LoginPage.jsx`:
```jsx
export default function LoginPage() {
  return <div className="page-center"><p>Login</p></div>
}
```

Create `src/pages/OnboardingPage.jsx`:
```jsx
export default function OnboardingPage() {
  return <div className="page-center"><p>Onboarding</p></div>
}
```

Create `src/pages/HomePage.jsx`:
```jsx
export default function HomePage() {
  return <div className="page-center"><h1>DollarSmart</h1><p>Home (placeholder)</p></div>
}
```

Create `src/components/AuthGate.jsx` (placeholder — implemented in Task 2):
```jsx
export default function AuthGate({ children }) {
  return children
}
```

Create `src/components/HouseholdGate.jsx` (placeholder — implemented in Task 4):
```jsx
export default function HouseholdGate({ children }) {
  return children
}
```

- [ ] **Step 5: Add base page styles to `src/App.css`**

Append (do not replace the existing content):
```css
.page-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1.5rem;
  text-align: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #10B981; color: #fff; }
.btn-secondary { background: #1E293B; color: #F8FAFC; border: 1px solid #334155; }
```

- [ ] **Step 6: Run dev server to verify route tree compiles with no errors**

```bash
npm run dev
```
Open `http://localhost:5173` — should show the HomePage placeholder ("DollarSmart / Home (placeholder)"). Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add React Router route tree with placeholder pages and gates"
```

---

## Task 2: Auth context with Firebase Google Sign-In

**Files:**
- Create: `src/contexts/AuthContext.jsx`
- Modify: `src/components/AuthGate.jsx` (replace placeholder)
- Modify: `src/pages/LoginPage.jsx` (replace placeholder)
- Modify: `src/main.jsx` (wrap with AuthProvider)

- [ ] **Step 1: Create `src/contexts/AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../firebase/client.js'

const AuthContext = createContext(null)

const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out

  useEffect(() => {
    return onAuthStateChanged(auth, setUser)
  }, [])

  function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider)
  }

  function signOutUser() {
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Wrap the app with AuthProvider in `src/main.jsx`**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import App from './App.jsx'
import './firebase/client.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 3: Implement `src/components/AuthGate.jsx`**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function AuthGate({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null // loading — render nothing until auth resolves
  if (user === null) return <Navigate to="/login" replace />
  return children
}
```

- [ ] **Step 4: Implement `src/pages/LoginPage.jsx`**

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  async function handleSignIn() {
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Sign-in failed', err)
    }
  }

  return (
    <div className="page-center">
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💸 DollarSmart</h1>
      <p style={{ color: '#94A3B8', marginBottom: '2rem' }}>Couples budgeting, made simple.</p>
      <button className="btn btn-primary" onClick={handleSignIn}>
        Sign in with Google
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Verify the app still boots with no console errors**

```bash
npm run dev
```
Navigate to `http://localhost:5173` — should land on the Login page (AuthGate redirects unauthenticated users). Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Firebase Auth context, Google sign-in, AuthGate"
```

---

## Task 3: Pure household logic (invite code generation, expiry, Firestore ops)

**Files:**
- Create: `src/lib/household.js`

This file contains only pure functions and Firestore calls — no React. Tested directly in Task 6.

- [ ] **Step 1: Create `src/lib/household.js`**

```js
import {
  doc, setDoc, getDoc, updateDoc, collection, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/client.js'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous O/0/1/I

export function generateCode() {
  let code = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (const byte of array) {
    code += CODE_CHARS[byte % CODE_CHARS.length]
  }
  return code
}

export function isCodeExpired(inviteExpiresAt) {
  if (!inviteExpiresAt) return true
  const expiresMs = inviteExpiresAt.toMillis
    ? inviteExpiresAt.toMillis()
    : new Date(inviteExpiresAt).getTime()
  return Date.now() > expiresMs
}

export async function createHousehold(uid) {
  const householdRef = doc(collection(db, 'households'))
  const code = generateCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h from now

  await setDoc(householdRef, {
    memberUids: [uid],
    inviteCode: code,
    inviteExpiresAt: expiresAt,
    inviteUsed: false,
    createdAt: serverTimestamp(),
  })

  // Write householdId onto the user's profile doc
  await setDoc(doc(db, 'users', uid), { householdId: householdRef.id }, { merge: true })

  return { householdId: householdRef.id, inviteCode: code }
}

export async function joinHousehold(uid, code) {
  // Find the household by invite code — query is done by scanning (only 2 users, fine)
  // For scalability this would be a separate /inviteCodes collection, but YAGNI for 2 users.
  // Instead, the joiner is given the householdId via out-of-band sharing along with the code,
  // OR we use a dedicated /inviteCodes/{code} lookup doc.
  // We use a lookup doc for clean UX: /inviteCodes/{code} → { householdId }
  const lookupRef = doc(db, 'inviteCodes', code)
  const lookupSnap = await getDoc(lookupRef)

  if (!lookupSnap.exists()) {
    throw new Error('INVALID_CODE')
  }

  const { householdId } = lookupSnap.data()
  const householdRef = doc(db, 'households', householdId)
  const householdSnap = await getDoc(householdRef)

  if (!householdSnap.exists()) throw new Error('INVALID_CODE')

  const household = householdSnap.data()

  if (household.inviteUsed) throw new Error('CODE_ALREADY_USED')
  if (isCodeExpired(household.inviteExpiresAt)) throw new Error('CODE_EXPIRED')
  if (household.memberUids.includes(uid)) throw new Error('ALREADY_MEMBER')

  // Atomically mark the code used and add the joiner
  await updateDoc(householdRef, {
    memberUids: [...household.memberUids, uid],
    inviteUsed: true,
  })

  // Write householdId onto the joiner's profile
  await setDoc(doc(db, 'users', uid), { householdId }, { merge: true })

  return { householdId }
}

export async function createInviteCode(uid, householdId) {
  const code = generateCode()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  // Store the lookup doc so joiners can find the household by code
  await setDoc(doc(db, 'inviteCodes', code), { householdId, createdBy: uid })

  // Update the household with the fresh code
  await updateDoc(doc(db, 'households', householdId), {
    inviteCode: code,
    inviteExpiresAt: expiresAt,
    inviteUsed: false,
  })

  return code
}
```

> **Note:** This introduces an `inviteCodes/{code}` lookup collection. Add this to `firestore.rules` in Task 5: invite codes are publicly readable (so joiners can look up a household by code) but writable only by authenticated users.

- [ ] **Step 2: Commit**

```bash
git add src/lib/household.js
git commit -m "feat: add pure household logic (code generation, create, join)"
```

---

## Task 4: useHousehold hook + HouseholdGate

**Files:**
- Create: `src/hooks/useHousehold.js`
- Modify: `src/components/HouseholdGate.jsx` (replace placeholder)

- [ ] **Step 1: Create `src/hooks/useHousehold.js`**

```js
import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export function useHousehold() {
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState(undefined) // undefined = loading
  const [household, setHousehold] = useState(null)

  // Watch the user's profile for a householdId
  useEffect(() => {
    if (!user) { setHouseholdId(null); return }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setHouseholdId(snap.exists() ? (snap.data().householdId ?? null) : null)
    })
    return unsub
  }, [user])

  // Watch the household doc once we have its id
  useEffect(() => {
    if (!householdId) { setHousehold(null); return }
    const unsub = onSnapshot(doc(db, 'households', householdId), (snap) => {
      setHousehold(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
    return unsub
  }, [householdId])

  return { householdId, household, loading: householdId === undefined }
}
```

- [ ] **Step 2: Implement `src/components/HouseholdGate.jsx`**

```jsx
import { Navigate } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold.js'

export default function HouseholdGate({ children }) {
  const { householdId, loading } = useHousehold()
  if (loading) return null
  if (!householdId) return <Navigate to="/onboarding" replace />
  return children
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHousehold.js src/components/HouseholdGate.jsx
git commit -m "feat: add useHousehold hook and HouseholdGate"
```

---

## Task 5: Onboarding UI + update Firestore rules for inviteCodes

**Files:**
- Modify: `src/pages/OnboardingPage.jsx` (replace placeholder)
- Modify: `firestore.rules` (add inviteCodes rule)

- [ ] **Step 1: Update `firestore.rules` to allow inviteCodes lookups**

Replace the full file:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isUser(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    function isHouseholdMember(householdId) {
      return request.auth != null
        && exists(/databases/$(database)/documents/households/$(householdId))
        && request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.memberUids;
    }

    match /users/{uid} {
      allow read, write: if isUser(uid);
    }

    match /households/{householdId} {
      allow read: if isHouseholdMember(householdId);
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.memberUids;
      allow update, delete: if isHouseholdMember(householdId);
    }

    match /expenses/{expenseId} {
      allow read: if isUser(resource.data.uid);
      allow create: if isUser(request.resource.data.uid)
        && isHouseholdMember(request.resource.data.householdId);
      allow update, delete: if isUser(resource.data.uid);
    }

    // inviteCodes/{code}: publicly readable so joiners can look up a household
    // by code. Writable only by authenticated users (the creator writes it).
    match /inviteCodes/{code} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

- [ ] **Step 2: Implement `src/pages/OnboardingPage.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { createHousehold, joinHousehold, createInviteCode } from '../lib/household.js'

const ERROR_MESSAGES = {
  INVALID_CODE: 'That code doesn\'t exist. Double-check and try again.',
  CODE_ALREADY_USED: 'That code has already been used.',
  CODE_EXPIRED: 'That code has expired. Ask your partner to generate a new one.',
  ALREADY_MEMBER: 'You\'re already in a household.',
}

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('choose') // 'choose' | 'create' | 'join'
  const [inviteCode, setInviteCode] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const { householdId, inviteCode: code } = await createHousehold(user.uid)
      await createInviteCode(user.uid, householdId)
      setInviteCode(code)
      setView('create')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    setLoading(true)
    setError(null)
    try {
      await joinHousehold(user.uid, joinCode.trim().toUpperCase())
      navigate('/', { replace: true })
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (view === 'choose') {
    return (
      <div className="page-center">
        <h1 style={{ marginBottom: '0.5rem' }}>Welcome to DollarSmart</h1>
        <p style={{ color: '#94A3B8', marginBottom: '2rem' }}>Set up your household to get started.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: 320 }}>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            Create a household
          </button>
          <button className="btn btn-secondary" onClick={() => setView('join')} disabled={loading}>
            Join with a code
          </button>
        </div>
      </div>
    )
  }

  if (view === 'create') {
    return (
      <div className="page-center">
        <h2 style={{ marginBottom: '0.5rem' }}>Your household is ready!</h2>
        <p style={{ color: '#94A3B8', marginBottom: '1rem' }}>Share this code with your partner:</p>
        <div style={{
          fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.3em',
          background: '#1E293B', padding: '1rem 2rem', borderRadius: 16,
          marginBottom: '1.5rem', color: '#10B981',
        }}>
          {inviteCode}
        </div>
        <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Code expires in 24 hours and can only be used once.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>
          Continue →
        </button>
      </div>
    )
  }

  if (view === 'join') {
    return (
      <div className="page-center">
        <h2 style={{ marginBottom: '0.5rem' }}>Join a household</h2>
        <p style={{ color: '#94A3B8', marginBottom: '1.5rem' }}>Enter the code your partner shared with you.</p>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="XXXXXX"
          style={{
            fontSize: '2rem', fontWeight: 700, letterSpacing: '0.3em', textAlign: 'center',
            width: '100%', maxWidth: 220, padding: '0.75rem',
            background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155',
            borderRadius: 12, marginBottom: '1rem', outline: 'none',
          }}
        />
        {error && <p style={{ color: '#F87171', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => { setView('choose'); setError(null) }}>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={handleJoin}
            disabled={loading || joinCode.length !== 6}
          >
            {loading ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    )
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/OnboardingPage.jsx firestore.rules
git commit -m "feat: add onboarding UI (create/join household) and inviteCodes rule"
```

---

## Task 6: Unit tests for pure household logic

**Files:**
- Create: `tests/household.test.js`

- [ ] **Step 1: Write the test file**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCode, isCodeExpired } from '../src/lib/household.js'

// Mock firebase/client so importing household.js doesn't need a real Firebase app
vi.mock('../src/firebase/client.js', () => ({
  db: {},
  auth: {},
  app: {},
}))

describe('generateCode', () => {
  it('returns a 6-character string', () => {
    expect(generateCode()).toHaveLength(6)
  })

  it('uses only allowed characters (no O, 0, 1, I)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode()
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    }
  })

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateCode))
    expect(codes.size).toBeGreaterThan(95) // allow tiny collision probability
  })
})

describe('isCodeExpired', () => {
  it('returns true for a timestamp in the past', () => {
    const past = new Date(Date.now() - 1000)
    expect(isCodeExpired(past)).toBe(true)
  })

  it('returns false for a timestamp in the future', () => {
    const future = new Date(Date.now() + 60_000)
    expect(isCodeExpired(future)).toBe(false)
  })

  it('returns true for null/undefined', () => {
    expect(isCodeExpired(null)).toBe(true)
    expect(isCodeExpired(undefined)).toBe(true)
  })

  it('handles Firestore Timestamp-like objects with toMillis()', () => {
    const firestoreTs = { toMillis: () => Date.now() - 1000 }
    expect(isCodeExpired(firestoreTs)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the unit tests**

```bash
npm test
```
Expected: all tests PASS. No emulator needed — pure logic only.

- [ ] **Step 3: Commit**

```bash
git add tests/household.test.js
git commit -m "test: add unit tests for household code generation and expiry logic"
```

---

## Task 7: iPhone PWA install prompt

**Files:**
- Create: `src/components/IphoneInstallPrompt.jsx`
- Modify: `src/pages/OnboardingPage.jsx` (render prompt after household creation)

This component detects iPhone Safari (not already installed as PWA) and renders a persistent guide. Per the spec, it is not dismissible without a warning.

- [ ] **Step 1: Create `src/components/IphoneInstallPrompt.jsx`**

```jsx
import { useState } from 'react'

function isIphoneSafari() {
  const ua = navigator.userAgent
  const isIphone = /iPhone/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
  const isStandalone = window.navigator.standalone === true
  return isIphone && isSafari && !isStandalone
}

export default function IphoneInstallPrompt({ onDismiss }) {
  const [confirmSkip, setConfirmSkip] = useState(false)

  if (!isIphoneSafari()) return null

  if (confirmSkip) {
    return (
      <div style={overlay}>
        <div style={card}>
          <p style={{ color: '#F87171', fontWeight: 600, marginBottom: '0.75rem' }}>
            ⚠️ Without installing, you won't receive transaction notifications.
          </p>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            You can always install later from Safari's Share menu.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setConfirmSkip(false)}>Go back</button>
            <button className="btn btn-primary" onClick={onDismiss}>Skip anyway</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <h2 style={{ marginBottom: '0.5rem' }}>One more step 📱</h2>
        <p style={{ color: '#94A3B8', marginBottom: '1.25rem' }}>
          To receive notifications when you make a purchase, add DollarSmart to your Home Screen.
        </p>
        <ol style={{ textAlign: 'left', color: '#CBD5E1', lineHeight: 2, paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
          <li>Tap the <strong style={{ color: '#F8FAFC' }}>Share</strong> button at the bottom of Safari (the box with an arrow)</li>
          <li>Scroll down and tap <strong style={{ color: '#F8FAFC' }}>"Add to Home Screen"</strong></li>
          <li>Tap <strong style={{ color: '#F8FAFC' }}>Add</strong> in the top right</li>
          <li>Open DollarSmart from your Home Screen and allow notifications</li>
        </ol>
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.75rem' }} onClick={onDismiss}>
          Done — I added it ✓
        </button>
        <button
          style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.85rem', cursor: 'pointer' }}
          onClick={() => setConfirmSkip(true)}
        >
          Skip (not recommended)
        </button>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'flex-end', zIndex: 1000,
}

const card = {
  background: '#1E293B', borderRadius: '20px 20px 0 0',
  padding: '2rem 1.5rem', width: '100%', textAlign: 'center',
}
```

- [ ] **Step 2: Show the prompt after household creation in `src/pages/OnboardingPage.jsx`**

Add the import at the top of the file:
```jsx
import IphoneInstallPrompt from '../components/IphoneInstallPrompt.jsx'
```

Add state below the existing state declarations:
```jsx
const [showInstallPrompt, setShowInstallPrompt] = useState(false)
```

Replace the `handleCreate` function:
```jsx
async function handleCreate() {
  setLoading(true)
  setError(null)
  try {
    const { householdId, inviteCode: code } = await createHousehold(user.uid)
    await createInviteCode(user.uid, householdId)
    setInviteCode(code)
    setView('create')
    setShowInstallPrompt(true)
  } catch (err) {
    setError('Something went wrong. Please try again.')
  } finally {
    setLoading(false)
  }
}
```

Add the prompt rendering at the bottom of the component's return, inside each view's JSX, just before the closing `</div>` of the outermost `page-center` div in the `'create'` view:
```jsx
{showInstallPrompt && (
  <IphoneInstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
)}
```

- [ ] **Step 3: Run unit tests to confirm nothing regressed**

```bash
npm test
```
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/IphoneInstallPrompt.jsx src/pages/OnboardingPage.jsx
git commit -m "feat: add iPhone PWA install prompt on onboarding"
```

---

## Phase 2 Done — Definition of Complete

- [ ] `npm test` passes — code generation and expiry logic verified
- [ ] `npm run test:rules` passes — inviteCodes rule verified (set `JAVA_HOME` to JDK 21 if needed)
- [ ] Route tree: `/login` → Google sign-in, `/onboarding` → create/join household, `/` → home (behind both gates)
- [ ] AuthGate redirects unauthenticated users to `/login`
- [ ] HouseholdGate redirects linked users to `/onboarding`
- [ ] Household create: generates 6-char code, stores lookup doc, 24h expiry, single-use
- [ ] Household join: validates code, expiry, single-use, adds joiner to memberUids
- [ ] iPhone install prompt shown after household creation on iPhone Safari

**Next phase:** Phase 3 — Core Logging (Quick Log, Full Log, ÷2 split, income/expense toggle, offline IndexedDB sync, undo toast, Firestore writes).
