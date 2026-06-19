import { useState } from 'react'
import { normalizeAmount, validateAmount } from '../lib/expense.js'
import AmountInput from './AmountInput.jsx'
import CategoryGrid from './CategoryGrid.jsx'
import Sheet from './ui/Sheet.jsx'
import { haptics } from '../lib/haptics.js'

function toDateInput(date) {
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EditExpenseModal({ expense, onSave, onClose }) {
  const isIncome = expense.type === 'income'
  const [amountText, setAmountText] = useState(String(expense.amount ?? ''))
  const [categoryId, setCategoryId] = useState(expense.categoryId ?? null)
  const [poolType, setPoolType] = useState(expense.poolType ?? 'personal')
  const [merchantName, setMerchantName] = useState(expense.merchantName ?? '')
  const [note, setNote] = useState(expense.note ?? '')
  const [dateStr, setDateStr] = useState(toDateInput(expense.date))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const amount = normalizeAmount(amountText)
  const canSave = validateAmount(amount) && (isIncome || categoryId) && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError('')
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
      haptics.success()
      onClose()
    } catch (err) {
      console.error('Failed to update expense', err)
      setError("Couldn't save — check your connection and try again.")
      setSaving(false)
    }
  }

  const footer = (
    <div style={{ display: 'flex', gap: '0.875rem' }}>
      <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
        Cancel
      </button>
      <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={!canSave}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )

  return (
    <Sheet open onClose={onClose} title={`Edit ${isIncome ? 'income' : 'expense'}`} footer={footer}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
        <AmountInput value={amountText} onChange={setAmountText} autoFocus={false} />

        {!isIncome && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['personal', 'split'].map((p) => (
              <button
                key={p}
                onClick={() => setPoolType(p)}
                style={{
                  padding: '0.45rem 0.9rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
                  textTransform: 'capitalize', fontSize: 'var(--text-sm)',
                  background: poolType === p ? 'var(--accent)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: poolType === p ? '#fff' : 'var(--text)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {!isIncome && <CategoryGrid selected={categoryId} onSelect={setCategoryId} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 360 }}>
          <input type="text" value={merchantName} onChange={(e) => setMerchantName(e.target.value)}
            placeholder="Company / merchant (optional)" style={fieldStyle} />
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)}
            style={{ ...fieldStyle, colorScheme: 'dark' }} />
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)" style={fieldStyle} />
        </div>

        {error && (
          <p style={{ width: '100%', maxWidth: 360, margin: 0, color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}

const fieldStyle = {
  width: '100%', padding: '0.75rem', borderRadius: 10,
  background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none',
}
