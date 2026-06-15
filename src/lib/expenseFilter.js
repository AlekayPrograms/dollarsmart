// Time-based filtering for the expenses list. A "period" is:
//   { mode: 'all' | 'year' | 'month' | 'day', value: string }
// where value is 'YYYY', 'YYYY-MM', or 'YYYY-MM-DD' respectively. Because each
// finer granularity's value is a prefix of a full local date string, matching
// reduces to a single startsWith.

export function toLocalDateStr(date) {
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function matchesPeriod(date, period) {
  if (!period || period.mode === 'all' || !period.value) return true
  const str = toLocalDateStr(date)
  if (!str) return false
  return str.startsWith(period.value)
}

// Distinct years present in the data, newest first, always including the
// current year so the picker is never empty.
export function availableYears(dates, currentYear = new Date().getFullYear()) {
  const set = new Set([String(currentYear)])
  for (const d of dates) {
    const str = toLocalDateStr(d)
    if (str) set.add(str.slice(0, 4))
  }
  return [...set].sort((a, b) => Number(b) - Number(a))
}
