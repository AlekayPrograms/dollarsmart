# DollarSmart

A personal budgeting app for couples and households to track shared and
individual spending together. React + Vite PWA + Firebase.

**Live app:** https://dollarsmart-couple.web.app (Google sign-in required)

## What it does

DollarSmart helps the people in a household stay on top of their money in one
shared place. Members log expenses and income — manually or by connecting a bank
account — and categorize each as **personal**, **shared**, or **split**. The app
then shows:

- Combined household budgets and per-category monthly targets
- A running bank balance and a projected end-of-month balance
- Spending insights and trends, browsable by month
- Recurring bills and income that post automatically each month
- Notifications when a new transaction is detected, when a partner logs a shared
  expense, and when spending approaches a budget target

## Who it's for

Couples and households who want a single, private view of their combined
finances — both what they share and what's individual to each person.

## How it uses Plaid

When a member connects a bank account, DollarSmart uses Plaid's **Transactions**
product to retrieve transaction history and to detect new transactions in near
real time via webhook (`SYNC_UPDATES_AVAILABLE` → `/transactions/sync`). Each
detected transaction prompts the user to confirm and categorize it before it
enters their budget.

Plaid data is used **solely** to power each user's own budgeting features inside
the app. We do not sell it, share it with third parties, or use it for
advertising. Plaid access tokens are stored server-side only (in a Cloud
Function–restricted Firestore document) and are never exposed to the client.

## Tech stack

- **Frontend:** React 18 + Vite, installable PWA
- **Backend:** Firebase — Firestore, Authentication (Google), Cloud Messaging,
  Cloud Functions (2nd gen, Node 22)
- **Bank data:** Plaid (Transactions), webhook-driven via an HTTPS Cloud Function
  with signature verification
- **Hosting:** Firebase Hosting

## Privacy & security

- Shared/split expenses are visible to household members; personal expenses stay
  private to their owner, enforced by Firestore security rules.
- Plaid access tokens live in a server-only Firestore collection that no client
  can read or write.
- Secrets (Plaid keys, API keys) are stored in Google Secret Manager.

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

To route the app at the emulator during dev, set `VITE_USE_EMULATOR=true` in `.env.local`.

## Architecture

See `docs/superpowers/specs/2026-06-12-dollarsmart-design.md` for the full design.
