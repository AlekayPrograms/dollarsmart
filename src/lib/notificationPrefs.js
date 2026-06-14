export const DEFAULT_PREFS = {
  transactionAlert: true,
  dailyNudge: false,
  nudgeTime: '20:00',
  partnerActivity: true,
  approachingTarget: true,
}

export function applyPrefDefaults(stored) {
  const out = { ...DEFAULT_PREFS }
  if (stored && typeof stored === 'object') {
    for (const key of Object.keys(DEFAULT_PREFS)) {
      if (key in stored && stored[key] !== undefined) out[key] = stored[key]
    }
  }
  return out
}
