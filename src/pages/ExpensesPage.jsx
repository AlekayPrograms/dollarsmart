import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useSharedExpenses } from '../hooks/useSharedExpenses.js'
import { deleteExpense, restoreExpense } from '../lib/expenseStore.js'
import ExpenseCard from '../components/ExpenseCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import UndoToast from '../components/UndoToast.jsx'

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
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ pool: 'all', category: 'all' })
  const [pendingDelete, setPendingDelete] = useState(null) // the expense being deleted

  // All of my expenses + the household's shared/split (both partners), deduped
  // by id and sorted newest-first.
  const merged = useMemo(() => {
    const map = new Map()
    for (const e of mine) map.set(e.id, e)
    for (const e of shared) map.set(e.id, e)
    return [...map.values()].sort((a, b) => dateMs(b.date) - dateMs(a.date))
  }, [mine, shared])

  const visible = useMemo(() => {
    return merged.filter((e) => {
      if (pendingDelete && e.id === pendingDelete.id) return false
      if (filters.pool !== 'all' && e.poolType !== filters.pool) return false
      if (filters.category !== 'all' && e.categoryId !== filters.category) return false
      return true
    })
  }, [merged, filters, pendingDelete])

  const handleDelete = useCallback(async (expense) => {
    setPendingDelete(expense)
    await deleteExpense(expense.id)
  }, [])

  const handleUndo = useCallback(async () => {
    if (pendingDelete) {
      await restoreExpense(pendingDelete)
      setPendingDelete(null)
    }
  }, [pendingDelete])

  const handleExpire = useCallback(() => {
    setPendingDelete(null) // deletion already happened; just clear the toast
  }, [])

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '2rem', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 420, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Expenses</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {loading && <p style={{ color: '#64748B' }}>Loading…</p>}
      {!loading && visible.length === 0 && (
        <p style={{ color: '#64748B' }}>No expenses yet. Tap + Log to add one.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 420 }}>
        {visible.map((e) => (
          <ExpenseCard
            key={e.id}
            expense={e}
            byPartner={e.uid !== user?.uid}
            onDelete={e.uid === user?.uid ? handleDelete : undefined}
          />
        ))}
      </div>

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
