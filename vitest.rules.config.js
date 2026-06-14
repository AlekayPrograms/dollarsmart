import { defineConfig } from 'vite'

// Dedicated config for the Firestore rules tests. These need the Firestore
// emulator running and are excluded from the default `npm test` run (see
// vite.config.js), so they get their own include list here. Run via
// `npm run test:rules`, which wraps this in `firebase emulators:exec`.
export default defineConfig({
  test: {
    include: ['tests/firestore-rules.test.js'],
  },
})
