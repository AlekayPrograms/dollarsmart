import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExpenses } from '../hooks/useExpenses.js'
import { deleteExpense, restoreExpense } from '../lib/expenseStore.js'
import ExpenseCard from '../components/ExpenseCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import UndoToast from '../components/UndoToast.jsx'

export default function ExpensesPage() {
  const { expenses, loading } = useExpenses()
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ pool: 'all', category: 'all' })
  const [pendingDelete, setPendingDelete] = useState(null) // the expense being deleted

  const visible = useMemo(() => {
    return expenses.filter((e) => {
      if (pendingDelete && e.id === pendingDelete.id) return false
      if (filters.pool !== 'all' && e.poolType !== filters.pool) return false
      if (filters.category !== 'all' && e.categoryId !== filters.category) return false
      return true
    })
  }, [expenses, filters, pendingDelete])

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
          <ExpenseCard key={e.id} expense={e} onDelete={handleDelete} />
        ))}
      </div>

      {pendingDelete && (
        <UndoToast
          message="Expense deleted"
          onUndo={handleUndo}
          onExpire={handleExpire}
        />
      )}
    </div>
  )
}
