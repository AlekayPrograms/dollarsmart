function toDayNumber(date) {
  const d = date instanceof Date ? date : new Date(date)
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000
  )
}

/**
 * Count consecutive days (ending today or yesterday) that have at least one
 * logged entry. A streak ending yesterday still counts so the user isn't
 * punished before they've logged today.
 */
export function currentStreak(dates, today = new Date()) {
  if (!dates || dates.length === 0) return 0

  const days = new Set(dates.map(toDayNumber))
  const todayNum = toDayNumber(today)

  // The streak can anchor at today or yesterday; otherwise it's broken.
  let cursor
  if (days.has(todayNum)) cursor = todayNum
  else if (days.has(todayNum - 1)) cursor = todayNum - 1
  else return 0

  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor -= 1
  }
  return streak
}
