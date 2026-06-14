import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { normalizeAmount, validateAmount, splitInHalf } from '../lib/expense.js'
import { addExpense } from '../lib/expenseStore.js'
import AmountInput from '../components/AmountInput.jsx'
import CategoryGrid from '../components/CategoryGrid.jsx'
import TypeToggle from '../components/TypeToggle.jsx'
import SplitButton from '../components/SplitButton.jsx'

export default function LogPage() {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state || {}

  const [amountText, setAmountText] = useState(prefill.prefillAmount != null ? String(prefill.prefillAmount) : '')
  const [categoryId, setCategoryId] = useState(prefill.prefillCategoryId ?? null)
  const [type, setType] = useState('expense')
  const [poolType, setPoolType] = useState(prefill.prefillSplit ? 'split' : 'personal')
  const [showDetails, setShowDetails] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const amount = normalizeAmount(amountText)
  // Income has no spending category, so it doesn't require one.
  const canSave = validateAmount(amount) && (type === 'income' || categoryId) && !saving

  function handleSplit() {
    if (!validateAmount(amount)) return
    setAmountText(String(splitInHalf(amount)))
    setPoolType('split')
  }

  // Income is always personal — enforce on toggle.
  function handleTypeChange(next) {
    setType(next)
    if (next === 'income') setPoolType('personal')
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await addExpense({
        uid: user.uid,
        householdId,
        amount,
        categoryId: type === 'income' ? 'other' : categoryId,
        type,
        poolType: type === 'income' ? 'personal' : poolType,
        note,
      })
      if (prefill.pendingId) {
        await deleteDoc(doc(db, 'pendingTransactions', prefill.pendingId)).catch(() => {})
      }
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Failed to save', err)
      setSaving(false)
    }
  }

  return (
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '2rem', gap: '1.5rem' }}>
      <TypeToggle type={type} onChange={handleTypeChange} />

      <AmountInput value={amountText} onChange={setAmountText} />

      {type === 'expense' && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <SplitButton onSplit={handleSplit} active={poolType === 'split'} />
          <button
            onClick={() => setPoolType(poolType === 'shared' ? 'personal' : 'shared')}
            style={{
              padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
              background: poolType === 'shared' ? '#10B981' : '#1E293B',
              border: '1px solid #334155', color: '#F8FAFC',
            }}
          >
            {poolType === 'shared' ? 'Shared ✓' : 'Personal'}
          </button>
        </div>
      )}

      {type === 'expense' && (
        <CategoryGrid selected={categoryId} onSelect={setCategoryId} />
      )}

      {showDetails && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          style={{
            width: '100%', maxWidth: 360, padding: '0.75rem', borderRadius: 10,
            background: '#1E293B', border: '1px solid #334155', color: '#F8FAFC', outline: 'none',
          }}
        />
      )}

      <button
        onClick={() => setShowDetails((s) => !s)}
        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '0.85rem' }}
      >
        {showDetails ? '− Hide details' : '+ Add details'}
      </button>

      <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/', { replace: true })}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
