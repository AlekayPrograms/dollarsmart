import { useNavigate } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { getCategory } from '../lib/categories.js'
import { usePendingTransactions } from '../hooks/usePendingTransactions.js'

/**
 * Shows the most recent pending transaction with one-tap actions:
 *  - Log it: deep-links to Quick Log pre-filled (personal)
 *  - Split it: same but split ÷2 into the shared pool
 *  - Dismiss: deletes the pending doc
 */
export default function PendingTransactionBanner() {
  const pending = usePendingTransactions()
  const navigate = useNavigate()
  if (pending.length === 0) return null

  const tx = pending[0]
  const cat = getCategory(tx.categoryId)

  async function dismiss() {
    await deleteDoc(doc(db, 'pendingTransactions', tx.id))
  }

  function logIt(split) {
    navigate('/log', {
      state: {
        prefillAmount: tx.amount,
        prefillCategoryId: tx.categoryId,
        prefillSplit: split,
        pendingId: tx.id,
        prefillMerchantName: tx.merchantName,
        prefillDate: tx.date,
      },
    })
  }

  return (
    <div style={{
      width: '100%', maxWidth: 440, background: 'var(--surface)', borderRadius: 14,
      padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
      color: 'var(--text)', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '0.9rem' }}>
        {cat.emoji} Looks like you spent <strong>${tx.amount.toFixed(2)}</strong> at {tx.merchantName} — log it?
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => logIt(false)}>Log it</button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => logIt(true)}>Split it</button>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', color: 'var(--subtle)', cursor: 'pointer', fontSize: '1.2rem' }}
          title="Dismiss"
        >×</button>
      </div>
    </div>
  )
}
