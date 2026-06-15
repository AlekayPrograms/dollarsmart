import { balanceDelta } from './expense.js'
import { monthKey } from './recurring.js'

/**
 * Active recurring rules that haven't posted yet for the month of `now` — i.e.
 * the entries still due to hit the account before month end. Rules already
 * posted this month are excluded (they're already reflected in the balance).
 */
export function upcomingRecurring(recurring, now = new Date()) {
  const key = monthKey(now)
  return recurring.filter((r) => r.active !== false && r.lastPostedMonth !== key)
}

/**
 * Projected end-of-month balance: the current balance plus the net effect of
 * everything still due to post this month (recurring income adds, expenses
 * subtract). Returns null if no balance has been set.
 */
export function forecastBalance(balance, recurring, now = new Date()) {
  if (typeof balance !== 'number') return null
  return upcomingRecurring(recurring, now)
    .reduce((sum, r) => sum + balanceDelta(r.type, Number(r.amount) || 0), balance)
}
