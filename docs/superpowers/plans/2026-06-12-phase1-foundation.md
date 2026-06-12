# DollarSmart Phase 1: Foundation & Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an installable React+Vite PWA wired to Firebase, with secrets kept out of git and Firestore security rules enforced and tested in the emulator.

**Architecture:** A Vite-bundled React app configured as a PWA via `vite-plugin-pwa`. Firebase (Firestore + Auth + Functions) initialized through a single client module reading config from environment variables. Firestore security rules are written first against the data model from the spec and verified with `@firebase/rules-unit-testing` against the local emulator. No application features yet — this phase produces a booting, installable shell with a locked-down backend.

**Tech Stack:** React 18, Vite 5, vite-plugin-pwa, Firebase JS SDK v10, Firebase Emulator Suite, Vitest, @firebase/rules-unit-testing.

**Execution split:** Tasks 1–5 (scaffold/config) are a good fit for Qwen. Tasks 6–8 (Firestore security rules + emulator tests) are security-critical and should be executed by Claude.

---

## File Structure

```
DollarSmart/
├── .gitignore                      # ignore node_modules, .env, build output, firebase cache
├── .env.example                    # template showing required env var names (committed)
├── .env.local                      # actual secrets (NEVER committed)
├── package.json
├── vite.config.js                  # Vite + PWA plugin config
├── index.html                      # app entry HTML
├── firebase.json                   # emulator + hosting config
├── firestore.rules                 # Firestore security rules
├── .firebaserc                     # firebase project alias
├── public/
│   └── manifest.webmanifest        # PWA manifest (generated/managed by plugin)
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # root component (placeholder shell)
│   ├── firebase/
│   │   └── client.js               # Firebase init — reads env vars, exports app/db/auth
│   └── App.css                     # minimal base styles
└── tests/
    └── firestore-rules.test.js     # emulator-based security rule tests
```

---

## Task 1: Initialize npm project and Vite + React

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/App.css`

- [ ] **Step 1: Scaffold the Vite React project**

Run from `C:\Users\Alex\DollarSmart`:
```bash
npm create vite@latest . -- --template react
```
When prompted about the non-empty directory (docs/ and .git/ exist), choose **"Ignore files and continue"**.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```
Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Replace `src/App.jsx` with a minimal placeholder shell**

```jsx
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <h1>DollarSmart</h1>
      <p>Foundation ready.</p>
    </div>
  )
}

export default App
```

- [ ] **Step 4: Replace `src/App.css` with minimal base styles**

```css
:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background: #0F172A;
  color: #F8FAFC;
  font-family: Inter, system-ui, sans-serif;
}

.app-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
}
```

- [ ] **Step 5: Run the dev server to verify it boots**

Run: `npm run dev`
Expected: Vite prints a `localhost:5173` URL and the page shows "DollarSmart / Foundation ready." Stop the server with Ctrl+C after confirming.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React app shell"
```

---

## Task 2: Add .gitignore and environment variable template (Security Requirement #6)

**Files:**
- Create: `.gitignore`, `.env.example`
- Create (NOT committed): `.env.local`

- [ ] **Step 1: Write `.gitignore`**

```gitignore
# Dependencies
node_modules/

# Build output
dist/
dist-ssr/

# Environment / secrets
.env
.env.local
.env.*.local

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# Editor / OS
.vscode/
.idea/
.DS_Store
*.local
```

- [ ] **Step 2: Write `.env.example` (committed template — no real values)**

```bash
# Firebase Web App config (safe to expose to client — these are public identifiers)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- [ ] **Step 3: Create `.env.local` with placeholder values (NOT committed)**

This file holds the real Firebase config once the project exists (filled in Task 4, Step 3). For now, create it with empty placeholders so the app can import without crashing:
```bash
VITE_FIREBASE_API_KEY=placeholder
VITE_FIREBASE_AUTH_DOMAIN=placeholder
VITE_FIREBASE_PROJECT_ID=demo-dollarsmart
VITE_FIREBASE_STORAGE_BUCKET=placeholder
VITE_FIREBASE_MESSAGING_SENDER_ID=placeholder
VITE_FIREBASE_APP_ID=placeholder
```

- [ ] **Step 4: Verify `.env.local` is ignored by git**

Run: `git status --porcelain .env.local`
Expected: **no output** (file is ignored). If the file appears, the `.gitignore` is wrong — fix before continuing.

- [ ] **Step 5: Commit**

```bash
git add .gitignore .env.example
git commit -m "chore: add gitignore and env template, keep secrets out of git"
```

---

## Task 3: Install and configure Firebase SDK + PWA plugin

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `vite.config.js`

- [ ] **Step 1: Install Firebase and the PWA plugin**

```bash
npm install firebase
npm install -D vite-plugin-pwa
```
Expected: both added to `package.json`, no errors.

- [ ] **Step 2: Replace `vite.config.js` to register the PWA plugin**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DollarSmart',
        short_name: 'DollarSmart',
        description: 'Couples budgeting, made simple.',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 3: Add placeholder PWA icons**

The manifest references two icons. Create simple placeholder PNGs so the build doesn't warn. Run:
```bash
node -e "const fs=require('fs');const b=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');fs.writeFileSync('public/pwa-192x192.png',b);fs.writeFileSync('public/pwa-512x512.png',b);console.log('placeholder icons written');"
```
Expected: "placeholder icons written". (These get replaced with real branded icons in Phase 7.)

- [ ] **Step 4: Verify the production build succeeds and generates a service worker**

Run: `npm run build`
Expected: build completes, output includes `dist/sw.js` and `dist/manifest.webmanifest`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Firebase SDK and configure PWA plugin"
```

---

## Task 4: Firebase client initialization module

**Files:**
- Create: `src/firebase/client.js`

- [ ] **Step 1: Write the Firebase client module**

```js
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
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
export const db = getFirestore(app)
export const auth = getAuth(app)

// Connect to local emulators in dev when explicitly enabled
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080)
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
}
```

- [ ] **Step 2: Import the client in `src/main.jsx` to confirm it loads without crashing**

Modify `src/main.jsx` to add the import near the top (after existing imports):
```jsx
import './firebase/client.js'
```

- [ ] **Step 3: Run dev server to verify no import/runtime errors**

Run: `npm run dev`
Expected: page still loads "DollarSmart / Foundation ready." with no console errors about Firebase init. Stop with Ctrl+C.

> **NOTE (manual, by Alex):** The real Firebase web config values go into `.env.local` after creating the Firebase project at console.firebase.google.com. Until then the placeholder values are fine for emulator-only work.

- [ ] **Step 4: Commit**

```bash
git add src/firebase/client.js src/main.jsx
git commit -m "feat: add Firebase client initialization module"
```

---

## Task 5: Firebase project config and emulator setup

**Files:**
- Create: `firebase.json`, `.firebaserc`

- [ ] **Step 1: Install firebase-tools as a dev dependency**

```bash
npm install -D firebase-tools
```

- [ ] **Step 2: Write `.firebaserc`**

```json
{
  "projects": {
    "default": "demo-dollarsmart"
  }
}
```
(Using a `demo-` prefixed project ID lets the emulator run without a real cloud project.)

- [ ] **Step 3: Write `firebase.json` with Firestore rules + emulator config**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true
    },
    "singleProjectMode": true
  }
}
```

- [ ] **Step 4: Create a placeholder `firestore.rules` so the emulator can start**

(Real rules are written in Task 6 — this is a temporary locked-down default.)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 5: Verify the emulator starts**

Run: `npx firebase emulators:start --only firestore,auth`
Expected: emulator UI URL printed, Firestore on :8080, Auth on :9099. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add firebase.json .firebaserc firestore.rules
git commit -m "chore: add Firebase project config and emulator setup"
```

---

## Task 6: Write Firestore security rules (Security Requirements #1, #5) — CLAUDE EXECUTES

**Files:**
- Modify: `firestore.rules`

These rules enforce the spec's privacy model: each user reads/writes only their own data; household docs are readable only by members; expenses are readable only by their owner (personal privacy is total per the updated spec — feed shows only your own data).

- [ ] **Step 1: Write the full security rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: is the request authenticated as the given uid
    function isUser(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    // Helper: is the requester a member of the given household
    function isHouseholdMember(householdId) {
      return request.auth != null
        && exists(/databases/$(database)/documents/households/$(householdId))
        && request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.memberUids;
    }

    // users/{uid}: a user can read and write only their own profile doc
    match /users/{uid} {
      allow read, write: if isUser(uid);
    }

    // households/{householdId}: readable/writable only by members.
    // Creation: the creator must include their own uid in memberUids.
    match /households/{householdId} {
      allow read: if isHouseholdMember(householdId);
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.memberUids;
      allow update, delete: if isHouseholdMember(householdId);
    }

    // expenses/{expenseId}: an expense is readable and writable ONLY by the
    // user who logged it. Per the spec privacy model, each user's feed shows
    // only their own data — including shared/split entries they participated in.
    match /expenses/{expenseId} {
      allow read: if isUser(resource.data.uid);
      allow create: if isUser(request.resource.data.uid)
        && isHouseholdMember(request.resource.data.householdId);
      allow update, delete: if isUser(resource.data.uid);
    }
  }
}
```

- [ ] **Step 2: Commit (tests added next task)**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules enforcing per-user privacy"
```

---

## Task 7: Set up Vitest and write Firestore rules tests (Security verification) — CLAUDE EXECUTES

**Files:**
- Create: `tests/firestore-rules.test.js`
- Modify: `package.json` (test scripts)
- Modify: `vite.config.js` (Vitest config) OR create `vitest.config.js`

- [ ] **Step 1: Install testing dependencies**

```bash
npm install -D vitest @firebase/rules-unit-testing
```

- [ ] **Step 2: Add test scripts to `package.json`**

Add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:rules": "firebase emulators:exec --only firestore \"vitest run tests/firestore-rules.test.js\""
```

- [ ] **Step 3: Write the rules test file**

```js
import { readFileSync } from 'fs'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { setDoc, getDoc, doc } from 'firebase/firestore'

let testEnv

const ALICE = 'alice_uid'
const BOB = 'bob_uid'
const HOUSEHOLD = 'house_1'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-dollarsmart',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  // Seed a household with Alice and Bob as members, bypassing rules.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'households', HOUSEHOLD), {
      memberUids: [ALICE, BOB],
      inviteCode: 'ABC123',
      inviteUsed: true,
    })
  })
})

describe('users collection', () => {
  it('lets a user write their own profile', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(
      setDoc(doc(alice, 'users', ALICE), { displayName: 'Alice' })
    )
  })

  it('forbids writing another user profile', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(
      setDoc(doc(alice, 'users', BOB), { displayName: 'Hacker' })
    )
  })
})

describe('households collection', () => {
  it('lets a member read their household', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(getDoc(doc(alice, 'households', HOUSEHOLD)))
  })

  it('forbids a non-member from reading a household', async () => {
    const stranger = testEnv.authenticatedContext('stranger_uid').firestore()
    await assertFails(getDoc(doc(stranger, 'households', HOUSEHOLD)))
  })
})

describe('expenses collection', () => {
  it('lets a household member create their own expense', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertSucceeds(
      setDoc(doc(alice, 'expenses', 'exp1'), {
        amount: 24.5,
        categoryId: 'food',
        uid: ALICE,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'personal',
        date: new Date(),
      })
    )
  })

  it('forbids creating an expense under another user uid', async () => {
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(
      setDoc(doc(alice, 'expenses', 'exp2'), {
        amount: 10,
        categoryId: 'food',
        uid: BOB,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'personal',
        date: new Date(),
      })
    )
  })

  it('forbids reading another user expense (personal privacy)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'expenses', 'bob_exp'), {
        amount: 99,
        categoryId: 'shopping',
        uid: BOB,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'shared',
        date: new Date(),
      })
    })
    const alice = testEnv.authenticatedContext(ALICE).firestore()
    await assertFails(getDoc(doc(alice, 'expenses', 'bob_exp')))
  })

  it('forbids an unauthenticated user from creating an expense', async () => {
    const anon = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(doc(anon, 'expenses', 'exp3'), {
        amount: 5,
        categoryId: 'food',
        uid: ALICE,
        householdId: HOUSEHOLD,
        type: 'expense',
        poolType: 'personal',
        date: new Date(),
      })
    )
  })
})
```

- [ ] **Step 4: Run the rules tests against the emulator**

Run: `npm run test:rules`
Expected: all tests PASS. The `emulators:exec` wrapper boots Firestore, runs Vitest, then shuts the emulator down.

- [ ] **Step 5: Commit**

```bash
git add tests/firestore-rules.test.js package.json
git commit -m "test: add Firestore security rules emulator tests"
```

---

## Task 8: Verify PWA installability and document the run flow

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md` with setup + run instructions**

```markdown
# DollarSmart

A private couples budgeting PWA for two people. React + Vite + Firebase.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Firebase web config
   (from console.firebase.google.com → Project settings → Your apps).

## Development

- `npm run dev` — start the dev server (http://localhost:5173)
- `npm run build` — production build (generates PWA service worker)
- `npm run preview` — preview the production build locally

## Testing

- `npm test` — run unit tests
- `npm run test:rules` — run Firestore security rule tests against the emulator

## Emulator

- `npx firebase emulators:start --only firestore,auth` — local Firebase backend

## Architecture

See `docs/superpowers/specs/2026-06-12-dollarsmart-design.md` for the full design.
```

- [ ] **Step 2: Build and preview to confirm the PWA is installable**

Run:
```bash
npm run build
npm run preview
```
Open the printed URL in Chrome, open DevTools → Application → Manifest.
Expected: manifest loads with name "DollarSmart", theme color `#0F172A`, and a service worker is registered under Application → Service Workers. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, run, and test instructions"
```

---

## Phase 1 Done — Definition of Complete

- [ ] `npm run dev` boots the app shell with no console errors
- [ ] `npm run build` produces a service worker and manifest (installable PWA)
- [ ] `.env.local` is git-ignored and contains no committed secrets
- [ ] `npm run test:rules` passes — all security rules verified in the emulator
- [ ] Firebase client module initializes Firestore + Auth from env vars
- [ ] README documents setup/run/test

**Next phase:** Phase 2 — Auth & Household (Google sign-in, create/join household with single-use 24h invite codes).
