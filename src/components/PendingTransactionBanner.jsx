import { useNavigate } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { getCategory } from '../lib/categories.js'
import { usePendingTransactions } from '../hooks/usePendingTransactions.js'
import { motion, AnimatePresence } from 'framer-motion'

export default function PendingTransactionBanner() {
  const pending = usePendingTransactions()
  const navigate = useNavigate()

  function dismiss(id) {
    deleteDoc(doc(db, 'pendingTransactions', id))
  }

  function logIt(tx, split) {
    navigate('/log', {
      state: {
        prefillAmount: tx.amount,
        prefillCategoryId: tx.categoryId,
        prefillSplit: split,
        prefillType: tx.entryType === 'income' ? 'income' : 'expense',
        pendingId: tx.id,
        prefillMerchantName: tx.merchantName,
        prefillDate: tx.date,
      },
    })
  }

  if (pending.length === 0) return null

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <p style={{ margin: '0 0 6px', fontSize: 'var(--text-xs)', color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>
        Detected
      </p>

      {/* Horizontal scroll — same pill style as quick log chips */}
      <div style={{ position: 'relative' }}>
        <div
          className="hide-scrollbar"
          style={{
            display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center',
            overflowX: 'auto', overflowY: 'visible',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 4,
          }}
        >
          <AnimatePresence initial={false}>
            {pending.map((tx) => {
              const isIncome = tx.entryType === 'income'
              const cat = getCategory(tx.categoryId)
              const label = tx.merchantName || 'Unknown'
              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  }}
                >
                  {/* Tap → Log it */}
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => logIt(tx, false)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'none', border: 'none',
                      padding: '8px 4px 8px 12px',
                      fontSize: 'var(--text-sm)', color: 'var(--text)',
                      cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    <span>{isIncome ? '💰' : cat.emoji}</span>
                    <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                    <strong>${tx.amount.toFixed(2)}</strong>
                  </motion.button>

                  {/* ½ split shortcut (expenses only) */}
                  {!isIncome && (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => logIt(tx, true)}
                      title="Log as split"
                      style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: 'none', border: 'none', borderLeft: '1px solid var(--border)',
                        color: 'var(--accent)', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 700,
                        padding: '8px 8px',
                      }}
                    >
                      ½
                    </motion.button>
                  )}

                  {/* Dismiss */}
                  <button
                    onClick={() => dismiss(tx.id)}
                    aria-label="Dismiss"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: 'none', border: 'none', borderLeft: '1px solid var(--border)',
                      cursor: 'pointer', color: 'var(--subtle)', fontSize: '1rem', lineHeight: 1,
                      padding: '8px 10px',
                    }}
                  >×</button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Fade on the right to hint there's more to scroll */}
        {pending.length > 2 && (
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 4, width: 40,
            background: 'linear-gradient(to right, transparent, var(--bg))',
            pointerEvents: 'none',
          }} />
        )}
      </div>
    </div>
  )
}
