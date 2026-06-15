import { useState } from 'react'
import { normalizeAmount, validateAmount } from '../lib/expense.js'
import AmountInput from './AmountInput.jsx'
import CategoryGrid from './CategoryGrid.jsx'

// Turn a stored date (Firestore Timestamp | Date | string) into YYYY-MM-DD.
function toDateInput(date) {
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Modal for editing an existing expense. The owner can change amount, category,
 * pool type, merchant, note, and date. Income entries have no category/pool.
 *
 * @param {object} props
 * @param {object} props.expense - the expense being edited
 * @param {(id: string, updates: object) => Promise<void>} props.onSave
 * @param {() => void} props.onClose
 */
export default function EditExpenseModal({ expense, onSave, onClose }) {
  const isIncome = expense.type === 'income'
  const [amountText, setAmountText] = useState(String(expense.amount ?? ''))
  const [categoryId, setCategoryId] = useState(expense.categoryId ?? null)
  const [poolType, setPoolType] = useState(expense.poolType ?? 'personal')
  const [merchantName, setMerchantName] = useState(expense.merchantName ?? '')
  const [note, setNote] = useState(expense.note ?? '')
  const [dateStr, setDateStr] = useState(toDateInput(expense.date))
  const [saving, setSaving] = useState(false)

  const amount = normalizeAmount(amountText)
  const canSave = validateAmount(amount) && (isIncome || categoryId) && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const nextPool = isIncome ? 'personal' : poolType
      await onSave(expense.id, {
        amount,
        categoryId: isIncome ? (expense.categoryId ?? 'other') : categoryId,
        poolType: nextPool,
        merchantName,
        note,
        date: new Date(dateStr + 'T12:00:00'),
        splitRatio: nextPool === 'split' ? (expense.splitRatio ?? 0.5) : null,
      })
      onClose()
    } catch (err) {
      console.error('Failed to update expense', err)
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
          border: '1px solid var(--border)', borderBottom: 'none',
          padding: '1.25rem 1rem calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, alignSelf: 'flex-start' }}>
          Edit {isIncome ? 'income' : 'expense'}
        </h3>

        <AmountInput value={amountText} onChange={setAmountText} />

        {!isIncome && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['personal', 'shared', 'split'].map((p) => (
              <button
                key={p}
                onClick={() => setPoolType(p)}
                style={{
                  padding: '0.45rem 0.9rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
                  textTransform: 'capitalize', fontSize: '0.85rem',
                  background: poolType === p ? '#10B981' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: poolType === p ? '#fff' : 'var(--text)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {!isIncome && (
          <CategoryGrid selected={categoryId} onSelect={setCategoryId} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Company / merchant (optional)"
            style={fieldStyle}
          />
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={{ ...fieldStyle, colorScheme: 'dark' }}
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            style={fieldStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: 360, marginTop: '0.25rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

const fieldStyle = {
  width: '100%', padding: '0.75rem', borderRadius: 10,
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
}
