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

To route the app at the emulator during dev, set `VITE_USE_EMULATOR=true` in `.env.local`.

## Architecture

See `docs/superpowers/specs/2026-06-12-dollarsmart-design.md` for the full design.
