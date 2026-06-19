import { useState, useMemo, useCallback } from 'react'
import PageWrapper from '../components/PageWrapper.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useSharedExpenses } from '../hooks/useSharedExpenses.js'
import { useHousehold } from '../hooks/useHousehold.js'
import { deleteExpense, restoreExpense, updateExpense, voteToRemove, cancelRemovalVote } from '../lib/expenseStore.js'
import { matchesPeriod, availableYears } from '../lib/expenseFilter.js'
import ExpenseCard from '../components/ExpenseCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import UndoToast from '../components/UndoToast.jsx'
import EditExpenseModal from '../components/EditExpenseModal.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

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
  const { household } = useHousehold()
  const memberUids = household?.memberUids ?? []
  const [filters, setFilters] = useState({ pool: 'all', category: 'all', period: { mode: 'all', value: '' } })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [editing, setEditing] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

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

  const handleVoteRemove = useCallback(async (expense) => {
    await voteToRemove(expense.id, user.uid)
  }, [user])

  const handleCancelVote = useCallback(async (expense) => {
    await cancelRemovalVote(expense.id, user.uid)
  }, [user])

  const handleSaveEdit = useCallback(async (id, updates) => {
    await updateExpense(id, updates)
  }, [])

  const toggleSelect = useCallback((expense) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(expense.id)) next.delete(expense.id)
      else next.add(expense.id)
      return next
    })
  }, [])

  const exitSelect = useCallback(() => { setSelectMode(false); setSelected(new Set()) }, [])

  const deleteSelected = useCallback(async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    if (!window.confirm(`Delete ${ids.length} expense${ids.length > 1 ? 's' : ''}? This can't be undone.`)) return
    for (const id of ids) await deleteExpense({ id })
    exitSelect()
  }, [selected, exitSelect])

  return (
    <PageWrapper className="page-center" style={{ justifyContent: 'flex-start', gap: '0.875rem' }}>
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Expenses</h2>
        <button
          onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: 0 }}
        >
          {selectMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} years={years} />

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 440 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={72} borderRadius={14} />
          ))}
        </div>
      )}
      {!loading && visible.length === 0 && (
        <EmptyState
          icon="🧾"
          heading="No expenses here"
          sub={filters.pool !== 'all' || filters.category !== 'all' || filters.period.mode !== 'all'
            ? 'Try adjusting your filters'
            : 'Tap + Log to add your first one'}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 440 }}>
        {visible.map((e) => (
          <ExpenseCard
            key={e.id}
            expense={e}
            byPartner={e.uid !== user?.uid}
            currentUid={user?.uid}
            memberUids={memberUids}
            selectMode={selectMode}
            selected={selected.has(e.id)}
            onToggleSelect={e.uid === user?.uid && e.poolType !== 'split' ? toggleSelect : undefined}
            onDelete={e.uid === user?.uid && e.poolType !== 'split' ? handleDelete : undefined}
            onVoteRemove={e.poolType === 'split' ? handleVoteRemove : undefined}
            onCancelVote={e.poolType === 'split' ? handleCancelVote : undefined}
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

      {selectMode && (
        <div style={{
          position: 'fixed', left: 0, right: 0,
          bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 12px)',
          display: 'flex', justifyContent: 'center', zIndex: 90, padding: '0 1rem',
        }}>
          <button
            className="btn"
            onClick={deleteSelected}
            disabled={selected.size === 0}
            style={{ background: 'var(--danger)', color: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
          >
            {selected.size === 0 ? 'Select expenses to delete' : `Delete ${selected.size} selected`}
          </button>
        </div>
      )}

      {pendingDelete && (
        <UndoToast
          key={pendingDelete.id}
          message="Expense deleted"
          onUndo={handleUndo}
          onExpire={handleExpire}
        />
      )}
    </PageWrapper>
  )
}
