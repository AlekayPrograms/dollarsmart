// Pure helpers for monthly recurring expenses. A rule stores a `dayOfMonth`
// (1–31) and the `lastPostedMonth` it was most recently materialized for.
// These functions decide when a rule is due; the actual Firestore writes live
// in recurringStore.js and the client-side runner.

/** 'YYYY-MM' key for a Date. */
export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Number of days in the given month (monthIndex is 0–11). */
export function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/**
 * The day this rule should post in the given month, clamped so e.g. day 31 in
 * February lands on the last day of the month.
 */
export function effectiveDay(dayOfMonth, year, monthIndex) {
  return Math.min(dayOfMonth, lastDayOfMonth(year, monthIndex))
}

/**
 * Is the rule due to post for the month containing `now`? True when it's active,
 * hasn't already posted this month, and today is on or past its (clamped) day —
 * which also lets a missed day catch up the next time the app is opened.
 */
export function isRuleDue(rule, now = new Date()) {
  if (!rule || rule.active === false) return false
  const key = monthKey(now)
  if (rule.lastPostedMonth === key) return false
  const day = effectiveDay(rule.dayOfMonth, now.getFullYear(), now.getMonth())
  return now.getDate() >= day
}
