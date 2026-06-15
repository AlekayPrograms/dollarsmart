import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { normalizeAmount, validateAmount, splitInHalf } from '../lib/expense.js'
import { addExpense } from '../lib/expenseStore.js'
import { addRecurring } from '../lib/recurringStore.js'
import { monthKey } from '../lib/recurring.js'
import AmountInput from '../components/AmountInput.jsx'
import CategoryGrid from '../components/CategoryGrid.jsx'
import TypeToggle from '../components/TypeToggle.jsx'
import SplitButton from '../components/SplitButton.jsx'

export default function LogPage() {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  // Router state (in-app banner) takes priority; query params come from a
  // tapped push notification opened by the service worker.
  const prefill = {
    prefillAmount: location.state?.prefillAmount ?? (params.get('amount') ? Number(params.get('amount')) : undefined),
    prefillCategoryId: location.state?.prefillCategoryId ?? params.get('categoryId') ?? undefined,
    prefillSplit: location.state?.prefillSplit ?? false,
    pendingId: location.state?.pendingId ?? params.get('pendingId') ?? undefined,
    prefillDate: location.state?.prefillDate ?? params.get('date') ?? undefined,
    prefillMerchantName: location.state?.prefillMerchantName ?? params.get('merchantName') ?? undefined,
    prefillType: location.state?.prefillType ?? params.get('entryType') ?? undefined,
  }

  const [amountText, setAmountText] = useState(prefill.prefillAmount != null ? String(prefill.prefillAmount) : '')
  const [categoryId, setCategoryId] = useState(prefill.prefillCategoryId ?? null)
  const [type, setType] = useState(prefill.prefillType === 'income' ? 'income' : 'expense')
  const [poolType, setPoolType] = useState(prefill.prefillSplit ? 'split' : 'personal')
  const [showDetails, setShowDetails] = useState(false)
  const [note, setNote] = useState('')
  const [merchantName, setMerchantName] = useState(prefill.prefillMerchantName ?? '')
  const [dateStr, setDateStr] = useState(prefill.prefillDate ?? new Date().toISOString().slice(0, 10))
  const [repeatMonthly, setRepeatMonthly] = useState(false)
  const [repeatDay, setRepeatDay] = useState(() => Number(dateStr.slice(8, 10)) || new Date().getDate())
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
        merchantName,
        date: new Date(dateStr + 'T12:00:00'),
      })
      // Set up a monthly repeat. We just logged this month's, so stamp
      // lastPostedMonth to the current month to avoid an immediate re-post.
      // Income recurs as personal with no spending category.
      if (repeatMonthly) {
        await addRecurring({
          uid: user.uid,
          householdId,
          amount,
          categoryId: type === 'income' ? 'other' : categoryId,
          type,
          poolType: type === 'income' ? 'personal' : poolType,
          note,
          merchantName,
          dayOfMonth: Math.min(Math.max(Number(repeatDay) || 1, 1), 31),
          splitRatio: 0.5,
          lastPostedMonth: monthKey(new Date()),
        })
      }
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
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '1rem', gap: '0.75rem' }}>
      {merchantName && (
        <div style={{ width: '100%', maxWidth: 360, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--subtle)' }}>
            From <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{merchantName}</span>
          </p>
        </div>
      )}

      <TypeToggle type={type} onChange={handleTypeChange} />

      <AmountInput value={amountText} onChange={setAmountText} />

      {type === 'expense' && (
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <SplitButton onSplit={handleSplit} active={poolType === 'split'} />
          <button
            onClick={() => setPoolType(poolType === 'shared' ? 'personal' : 'shared')}
            style={{
              padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
              background: poolType === 'shared' ? '#10B981' : 'var(--surface)',
              border: '1px solid var(--border)', color: 'var(--text)',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Company / merchant (optional)"
            style={{
              width: '100%', padding: '0.75rem', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
            }}
          />
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
              outline: 'none', colorScheme: 'dark',
            }}
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            style={{
              width: '100%', padding: '0.75rem', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
            }}
          />

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem',
          }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={repeatMonthly}
                  onChange={(e) => setRepeatMonthly(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                  Repeat every month{type === 'income' ? ' (income)' : ''}
                </span>
              </label>
              {repeatMonthly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>On day</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={repeatDay}
                    onChange={(e) => setRepeatDay(e.target.value)}
                    style={{
                      width: 64, padding: '0.4rem 0.5rem', borderRadius: 8, textAlign: 'center',
                      background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>of each month</span>
                </div>
              )}
              {repeatMonthly && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: 'var(--subtle)' }}>
                  Days past 28 land on the last day in shorter months. Manage these in Settings.
                </p>
              )}
            </div>
        </div>
      )}

      <button
        onClick={() => setShowDetails((s) => !s)}
        style={{ background: 'none', border: 'none', color: 'var(--subtle)', cursor: 'pointer', fontSize: '0.85rem' }}
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
