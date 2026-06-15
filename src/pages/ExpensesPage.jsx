import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useSharedExpenses } from '../hooks/useSharedExpenses.js'
import { deleteExpense, restoreExpense, updateExpense } from '../lib/expenseStore.js'
import { adjustBankBalance, balanceDelta } from '../lib/bankStore.js'
import { matchesPeriod, availableYears } from '../lib/expenseFilter.js'
import ExpenseCard from '../components/ExpenseCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import UndoToast from '../components/UndoToast.jsx'
import EditExpenseModal from '../components/EditExpenseModal.jsx'

function dateMs(d) {
  if (!d) return 0
  if (d.toDate) return d.toDate().getTime()
  if (d instanceof Date) return d.getTime()
  return new Date(d).getTime()
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const { expenses: mine, loading } = useExpenses()
  const { expenses: shared } = useSharedExpenses()
  const [filters, setFilters] = useState({ pool: 'all', category: 'all', period: { mode: 'all', value: '' } })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [editing, setEditing] = useState(null)

  const merged = useMemo(() => {
    const map = new Map()
    for (const e of mine) map.set(e.id, e)
    for (const e of shared) map.set(e.id, e)
    return [...map.values()].sort((a, b) => dateMs(b.date) - dateMs(a.date))
  }, [mine, shared])

  const years = useMemo(() => availableYears(merged.map((e) => e.date)), [merged])

  const visible = useMemo(() => {
    return merged.filter((e) => {
      if (pendingDelete && e.id === pendingDelete.id) return false
      if (filters.pool !== 'all' && e.poolType !== filters.pool) return false
      if (filters.category !== 'all' && e.categoryId !== filters.category) return false
      if (!matchesPeriod(e.date, filters.period)) return false
      return true
    })
  }, [merged, filters, pendingDelete])

  const handleDelete = useCallback(async (expense) => {
    setPendingDelete(expense)
    await deleteExpense(expense)
  }, [])

  const handleUndo = useCallback(async () => {
    if (pendingDelete) {
      await restoreExpense(pendingDelete)
      setPendingDelete(null)
    }
  }, [pendingDelete])

  const handleExpire = useCallback(() => setPendingDelete(null), [])

  const handleUpdateMerchant = useCallback(async (expense, merchantName) => {
    await updateExpense(expense.id, { merchantName })
  }, [])

  const handleSaveEdit = useCallback(async (id, updates) => {
    await updateExpense(id, updates)
    // If the amount changed, shift the balance by the difference. (The edit
    // modal can't change income/expense type, so the sign is stable.)
    if (editing && typeof updates.amount === 'number' && updates.amount !== editing.amount) {
      const delta = balanceDelta(editing.type, updates.amount) - balanceDelta(editing.type, editing.amount)
      await adjustBankBalance(editing.uid, delta)
    }
  }, [editing])

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', gap: '0.875rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Expenses</h2>
      </div>

      <FilterBar filters={filters} onChange={setFilters} years={years} />

      {loading && <p style={{ color: 'var(--subtle)', fontSize: '0.875rem' }}>Loading…</p>}
      {!loading && visible.length === 0 && (
        <p style={{ color: 'var(--subtle)', fontSize: '0.875rem' }}>No expenses match this filter.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 440 }}>
        {visible.map((e) => (
          <ExpenseCard
            key={e.id}
            expense={e}
            byPartner={e.uid !== user?.uid}
            onDelete={e.uid === user?.uid ? handleDelete : undefined}
            onUpdateMerchant={e.uid === user?.uid ? handleUpdateMerchant : undefined}
            onEdit={e.uid === user?.uid ? setEditing : undefined}
          />
        ))}
      </div>

      {editing && (
        <EditExpenseModal
          expense={editing}
          onSave={handleSaveEdit}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingDelete && (
        <UndoToast
          key={pendingDelete.id}
          message="Expense deleted"
          onUndo={handleUndo}
          onExpire={handleExpire}
        />
      )}
    </div>
  )
}
