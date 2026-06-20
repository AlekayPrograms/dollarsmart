// src/pages/LogPage.jsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useHousehold } from '../hooks/useHousehold.js'
import { useExpenses } from '../hooks/useExpenses.js'
import { normalizeAmount, validateAmount } from '../lib/expense.js'
import { addExpense } from '../lib/expenseStore.js'
import { addSettlement } from '../lib/settleStore.js'
import { addRecurring } from '../lib/recurringStore.js'
import { monthKey } from '../lib/recurring.js'
import { predictCategory } from '../lib/categoryPredictor.js'
import { haptics } from '../lib/haptics.js'
import { spring } from '../lib/motion.js'
import { CATEGORIES } from '../lib/categories.js'
import CategoryGrid from '../components/CategoryGrid.jsx'
import Keypad from '../components/Keypad.jsx'
import { motion, AnimatePresence } from 'framer-motion'

function formatDateChip(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function LogPage() {
  const { user } = useAuth()
  const { householdId, household } = useHousehold()
  const { expenses } = useExpenses()
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const prefill = {
    prefillAmount: location.state?.prefillAmount ?? (params.get('amount') ? Number(params.get('amount')) : undefined),
    prefillCategoryId: location.state?.prefillCategoryId ?? params.get('categoryId') ?? undefined,
    prefillSplit: location.state?.prefillSplit ?? false,
    pendingId: location.state?.pendingId ?? params.get('pendingId') ?? undefined,
    prefillDate: location.state?.prefillDate ?? params.get('date') ?? undefined,
    prefillMerchantName: location.state?.prefillMerchantName ?? params.get('merchantName') ?? undefined,
    prefillType: location.state?.prefillType ?? params.get('entryType') ?? undefined,
  }

  const [amountText, setAmountText] = useState(
    prefill.prefillAmount != null ? String(prefill.prefillAmount) : ''
  )
  const [type, setType] = useState(prefill.prefillType === 'income' ? 'income' : 'expense')
  const [poolType, setPoolType] = useState(prefill.prefillSplit ? 'split' : 'personal')
  const [dateStr, setDateStr] = useState(prefill.prefillDate ?? new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [merchantName, setMerchantName] = useState(prefill.prefillMerchantName ?? '')
  const [repeatMonthly, setRepeatMonthly] = useState(false)
  const [repeatDay, setRepeatDay] = useState(() => Number(dateStr.slice(8, 10)) || new Date().getDate())
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const dateInputRef = useRef(null)

  // Partner info for P2P "To:" prompt
  const partnerUid = household?.memberUids?.find((u) => u !== user?.uid) ?? null
  const partnerProfile = household?.members?.[partnerUid] || {}
  const partnerName = partnerProfile.nickname || partnerProfile.name?.split(' ')[0] || 'Partner'

  // Whether this looks like a Venmo/Zelle/P2P transaction based on merchant name
  const isP2P = /venmo|zelle|cash ?app|paypal/i.test(merchantName)
  const isP2PExpense = isP2P && type === 'expense'
  const isP2PIncome  = isP2P && type === 'income'

  // Outbound P2P: who you're sending to ('partner' auto-suggested, 'other' = someone else)
  const [venmoRecipient, setVenmoRecipient] = useState('partner')
  // Inbound P2P: who sent it ('partner' auto-suggested, 'other' = someone else)
  const [venmoSender, setVenmoSender] = useState('partner')

  // Auto-suggest category from merchant history
  const suggestedCategoryId = merchantName ? predictCategory(expenses, merchantName) : null
  const [categoryId, setCategoryId] = useState(
    prefill.prefillCategoryId ?? suggestedCategoryId ?? null
  )

  // Apply suggestion once expenses load (they may not be ready on first render)
  useEffect(() => {
    if (!categoryId && suggestedCategoryId) setCategoryId(suggestedCategoryId)
  }, [suggestedCategoryId])

  const amount = normalizeAmount(amountText)
  const isPartnerPayment  = isP2PExpense && venmoRecipient === 'partner' && !!partnerUid
  const isPartnerReceipt  = isP2PIncome  && venmoSender    === 'partner' && !!partnerUid
  const canSave = validateAmount(amount) && !saving &&
    (type === 'income' || isPartnerPayment || !!categoryId)

  function handleKey(k) {
    if (k === '⌫') { setAmountText((prev) => prev.slice(0, -1)); return }
    if (k === '.') {
      if (amountText.includes('.')) return
      setAmountText((prev) => (prev === '' ? '0.' : prev + '.'))
      return
    }
    const dotIdx = amountText.indexOf('.')
    if (dotIdx !== -1 && amountText.length - dotIdx > 2) return
    setAmountText((prev) => prev + k)
  }

  function handleTypeChange(next) {
    setType(next)
    if (next === 'income') setPoolType('personal')
    haptics.light()
  }

  function handlePoolToggle(p) {
    // Split records the FULL amount you paid; the ledger tracks that your
    // partner owes their half. (No more halving the entered amount.)
    setPoolType(p)
    haptics.light()
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      // P2P received from the partner → record as a settlement, not income
      if (isPartnerReceipt) {
        const method = /venmo/i.test(merchantName) ? 'venmo'
          : /zelle/i.test(merchantName) ? 'zelle'
          : /cash ?app/i.test(merchantName) ? 'cashapp'
          : /paypal/i.test(merchantName) ? 'paypal' : 'transfer'
        await addSettlement({
          householdId, fromUid: partnerUid, toUid: user.uid,
          amount, method, note,
          date: new Date(dateStr + 'T12:00:00'),
        })
        if (prefill.pendingId) {
          await deleteDoc(doc(db, 'pendingTransactions', prefill.pendingId)).catch(() => {})
        }
        haptics.success()
        navigate('/', { replace: true })
        return
      }

      // P2P payment to the partner → record as a settlement, not an expense
      if (isPartnerPayment) {
        const method = /venmo/i.test(merchantName) ? 'venmo'
          : /zelle/i.test(merchantName) ? 'zelle'
          : /cash ?app/i.test(merchantName) ? 'cashapp'
          : /paypal/i.test(merchantName) ? 'paypal' : 'transfer'
        await addSettlement({
          householdId, fromUid: user.uid, toUid: partnerUid,
          amount, method, note,
          date: new Date(dateStr + 'T12:00:00'),
        })
        if (prefill.pendingId) {
          await deleteDoc(doc(db, 'pendingTransactions', prefill.pendingId)).catch(() => {})
        }
        haptics.success()
        navigate('/', { replace: true })
        return
      }

      const finalPool = type === 'income' ? 'personal' : poolType
      await addExpense({
        uid: user.uid, householdId, amount,
        categoryId: type === 'income' ? 'other' : categoryId,
        type, poolType: finalPool,
        splitMode: finalPool === 'split' ? 'full' : null,
        note, merchantName,
        date: new Date(dateStr + 'T12:00:00'),
      })
      if (repeatMonthly) {
        await addRecurring({
          uid: user.uid, householdId, amount,
          categoryId: type === 'income' ? 'other' : categoryId,
          type, poolType: finalPool,
          splitMode: finalPool === 'split' ? 'full' : null,
          note, merchantName,
          dayOfMonth: Math.min(Math.max(Number(repeatDay) || 1, 1), 31),
          splitRatio: 0.5,
          lastPostedMonth: monthKey(new Date()),
        })
      }
      if (prefill.pendingId) {
        await deleteDoc(doc(db, 'pendingTransactions', prefill.pendingId)).catch(() => {})
      }
      haptics.success()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Failed to save', err)
      setSaving(false)
    }
  }

  const displayAmount = amountText === '' ? '0' : amountText

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh',
      background: 'var(--bg)', overflow: 'hidden',
    }}>
      {/* TOP: all controls */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        padding: '14px 14px 10px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>

        {merchantName && (
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--subtle)', textAlign: 'center' }}>
            From <strong style={{ color: 'var(--muted)' }}>{merchantName}</strong>
          </p>
        )}

        {/* Expense / Income toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--surface)', borderRadius: 11, padding: 3, alignSelf: 'center' }}>
          {['expense', 'income'].map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              style={{
                padding: '5px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 600, textTransform: 'capitalize', fontSize: 'var(--text-sm)',
                background: type === t ? (t === 'income' ? 'var(--accent)' : 'var(--surface-2)') : 'transparent',
                color: 'var(--text)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Amount display */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: -3, lineHeight: 1, color: '#fff' }}>
            ${displayAmount}<span style={{ opacity: .35 }}>|</span>
          </div>
          {merchantName && suggestedCategoryId && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
              🧠 Looks like {CATEGORIES.find((c) => c.id === suggestedCategoryId)?.label}
            </div>
          )}
        </div>

        {/* Personal / Split + Date chip in one row */}
        {type === 'expense' && (
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            {['personal', 'split'].map((p) => (
              <button
                key={p}
                onClick={() => handlePoolToggle(p)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 10, border: '1px solid var(--border)',
                  cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize', fontSize: 'var(--text-sm)',
                  background: poolType === p ? 'rgba(16,185,129,.15)' : 'var(--surface)',
                  color: poolType === p ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {p === 'split' ? 'Split' : 'Personal'}
              </button>
            ))}
            {/* Date — a real native date input overlaid on the chip, so iOS/Safari
                opens its picker on tap (programmatic showPicker()/click() doesn't
                work on iOS PWAs). */}
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--surface)', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 10, padding: '7px 11px', fontSize: 'var(--text-sm)', fontWeight: 600,
                color: 'var(--muted)', whiteSpace: 'nowrap',
              }}>
                📅 {formatDateChip(dateStr)}
              </div>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                aria-label="Date"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 'none', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {type === 'expense' && poolType === 'split' && validateAmount(amount) && (
          <p style={{ margin: '-4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--subtle)', textAlign: 'center' }}>
            Logs the full ${amount.toFixed(2)} — your partner owes ${(amount / 2).toFixed(2)}
          </p>
        )}

        {/* P2P "To:" prompt — shown for Venmo/Zelle/etc. outflows */}
        {isP2P && partnerUid && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
              To:
            </span>
            {[{ value: 'partner', label: partnerName }, { value: 'other', label: 'Someone else' }].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setVenmoRecipient(value); haptics.light() }}
                style={{
                  padding: '5px 13px', borderRadius: 20, border: '1px solid var(--border)',
                  cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600,
                  background: venmoRecipient === value ? 'rgba(16,185,129,.15)' : 'var(--surface)',
                  color: venmoRecipient === value ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {label}
              </button>
            ))}
            {venmoRecipient === 'partner' && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 600 }}>
                → settles up
              </span>
            )}
          </div>
        )}

        {/* P2P "From:" prompt — shown for Venmo/Zelle/etc. income */}
        {isP2PIncome && partnerUid && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
              From:
            </span>
            {[{ value: 'partner', label: partnerName }, { value: 'other', label: 'Someone else' }].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setVenmoSender(value); haptics.light() }}
                style={{
                  padding: '5px 13px', borderRadius: 20, border: '1px solid var(--border)',
                  cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600,
                  background: venmoSender === value ? 'rgba(16,185,129,.15)' : 'var(--surface)',
                  color: venmoSender === value ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {label}
              </button>
            ))}
            {venmoSender === 'partner' && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 600 }}>
                → settles up
              </span>
            )}
          </div>
        )}

        {/* Category grid — 5×2, all 10 visible */}
        {type === 'expense' && !isPartnerPayment && (
          <div>
            <p style={{ margin: '0 0 7px', fontSize: 'var(--text-xs)', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
              Category
            </p>
            <CategoryGrid selected={categoryId} onSelect={(id) => { setCategoryId(id); haptics.light() }} />
          </div>
        )}

        {/* Add details — collapsible (note + repeat only) */}
        <button
          onClick={() => { setShowDetails((v) => !v); haptics.light() }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '9px 13px', cursor: 'pointer', width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-sm)', color: 'var(--muted)', fontWeight: 500 }}>
            <span>📋</span>
            <span>Add details</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--subtle)' }}>company · note · repeat</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--subtle)', transform: showDetails ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.smooth}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Company / brand (optional)"
                  style={fieldStyle}
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  style={fieldStyle}
                />
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={repeatMonthly}
                      onChange={(e) => setRepeatMonthly(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
                      Repeat every month
                    </span>
                  </label>
                  {repeatMonthly && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.6rem' }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>On day</span>
                      <input
                        type="number" min={1} max={31} value={repeatDay}
                        onChange={(e) => setRepeatDay(e.target.value)}
                        style={{ width: 64, padding: '0.4rem 0.5rem', borderRadius: 8, textAlign: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                      />
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>of each month</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* BOTTOM: keypad + save, always pinned */}
      <div style={{
        flexShrink: 0, padding: '8px 14px',
        paddingBottom: 'calc(8px + var(--safe-bottom))',
        background: '#141414', borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 7,
      }}>
        <Keypad onKey={handleKey} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => navigate('/', { replace: true })}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleSave}
            disabled={!canSave}
          >
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
  fontSize: 'var(--text-base)',
}
