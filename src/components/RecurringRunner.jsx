import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { useRecurring } from '../hooks/useRecurring.js'
import { addExpense } from '../lib/expenseStore.js'
import { markRecurringPosted } from '../lib/recurringStore.js'
import { isRuleDue, monthKey, effectiveDay } from '../lib/recurring.js'

/**
 * Invisible component that posts due recurring expenses. It runs whenever the
 * rule list changes (i.e. on load): any active rule whose day has arrived and
 * which hasn't posted this month is materialized into a real expense, then
 * stamped so it won't post again until next month. Catches up missed days when
 * the app is reopened.
 */
export default function RecurringRunner() {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { recurring } = useRecurring()
  const processing = useRef(new Set())

  useEffect(() => {
    if (!user || !householdId) return
    const now = new Date()
    const key = monthKey(now)

    for (const rule of recurring) {
      if (!isRuleDue(rule, now) || processing.current.has(rule.id)) continue
      processing.current.add(rule.id)

      const day = effectiveDay(rule.dayOfMonth, now.getFullYear(), now.getMonth())
      const date = new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0)

      ;(async () => {
        try {
          await addExpense({
            uid: rule.uid,
            householdId: rule.householdId ?? householdId,
            amount: rule.amount,
            categoryId: rule.categoryId,
            type: rule.type,
            poolType: rule.poolType,
            note: rule.note,
            merchantName: rule.merchantName,
            date,
            splitRatio: rule.splitRatio ?? 0.5,
          })
          await markRecurringPosted(rule.id, key)
        } catch (err) {
          console.error('Failed to post recurring expense', err)
          processing.current.delete(rule.id) // let it retry on the next change
        }
      })()
    }
  }, [user, householdId, recurring])

  return null
}
