import { useState } from 'react'
import { getCategory } from '../lib/categories.js'

const POOL_BADGE = {
  personal: { label: 'Personal', color: 'rgba(148,163,184,0.15)' },
  shared:   { label: 'Shared',   color: 'rgba(16,185,129,0.15)' },
  split:    { label: 'Split',    color: 'rgba(59,130,246,0.15)' },
}

function formatDate(date) {
  const d = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date))
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const voteBtn = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1,
}

export default function ExpenseCard({
  expense, onDelete, onUpdateMerchant, onEdit,
  onVoteRemove, onCancelVote, currentUid, memberUids = [],
  selectMode = false, selected = false, onToggleSelect, byPartner = false,
}) {
  const cat = getCategory(expense.categoryId)
  const isIncome = expense.type === 'income'
  const badge = isIncome ? { label: 'Income', color: 'rgba(16,185,129,0.15)' } : (POOL_BADGE[expense.poolType] ?? POOL_BADGE.personal)
  const selectable = selectMode && !!onToggleSelect
  const canEdit = !!onUpdateMerchant && !isIncome && !selectMode

  const isShared = !isIncome && (expense.poolType === 'shared' || expense.poolType === 'split')
  const votes = expense.removalVotes || {}
  const iVoted = currentUid ? !!votes[currentUid] : false
  const partnerVoted = memberUids.some((u) => u !== currentUid && votes[u])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(expense.merchantName || '')

  async function commit() {
    setEditing(false)
    const next = draft.trim()
    if (next !== (expense.merchantName || '')) {
      await onUpdateMerchant(expense, next)
    }
  }

  function startEdit() {
    setDraft(expense.merchantName || '')
    setEditing(true)
  }

  const merchant = expense.merchantName

  return (
    <div
      onClick={selectable ? () => onToggleSelect(expense) : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'var(--surface)', borderRadius: 14,
        padding: '0.75rem 0.875rem', width: '100%',
        border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
        cursor: selectable ? 'pointer' : 'default',
        opacity: selectMode && !selectable ? 0.45 : 1,
        transition: 'border-color 0.15s, opacity 0.15s',
      }}
    >
      {selectMode && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${selected ? 'var(--accent)' : 'var(--subtle)'}`,
          background: selected ? 'var(--accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.7rem', lineHeight: 1,
        }}>
          {selected ? '✓' : ''}
        </div>
      )}

      <div style={{
        width: 42, height: 42, borderRadius: 11,
        background: cat.color + '22',
        border: `1px solid ${cat.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.2rem', flexShrink: 0,
      }}>
        {cat.emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{cat.label}</span>
          {byPartner && (
            <span style={{ fontSize: '0.7rem', color: 'var(--subtle)', background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '1px 6px' }}>
              Partner
            </span>
          )}
        </div>

        {/* Company / merchant — editable inline by the owner */}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            placeholder="Company name"
            style={{
              width: '100%', marginTop: 2, padding: '2px 6px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.8125rem', outline: 'none',
            }}
          />
        ) : merchant ? (
          <div
            onClick={canEdit ? startEdit : undefined}
            style={{
              fontSize: '0.8125rem', color: 'var(--muted)', marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              cursor: canEdit ? 'text' : 'default',
            }}
          >
            {merchant}
          </div>
        ) : canEdit ? (
          <div
            onClick={startEdit}
            style={{ fontSize: '0.8125rem', color: 'var(--subtle)', marginTop: 1, cursor: 'text', fontStyle: 'italic' }}
          >
            + Add company
          </div>
        ) : null}

        {expense.note && (
          <div style={{ fontSize: '0.75rem', color: 'var(--subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {expense.note}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: 3 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--subtle)', fontVariantNumeric: 'tabular-nums' }}>
            {formatDate(expense.date)}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--subtle)' }}>·</span>
          <span style={{
            fontSize: '0.68rem', fontWeight: 600,
            color: badge.color === 'rgba(16,185,129,0.15)' ? '#10B981' : 'var(--subtle)',
            background: badge.color, borderRadius: 5, padding: '1px 5px',
          }}>
            {badge.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <span style={{
          fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em',
          color: isIncome ? '#10B981' : 'var(--text)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {isIncome ? '+' : '−'}${expense.amount.toFixed(2)}
        </span>
        {!selectMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onEdit && (
            <button
              onClick={() => onEdit(expense)}
              style={{ background: 'none', border: 'none', color: 'var(--subtle)', cursor: 'pointer', fontSize: '0.9rem', padding: 0, lineHeight: 1 }}
              title="Edit"
            >
              ✎
            </button>
          )}

          {/* Shared/split expenses are removed by mutual vote, not deleted. */}
          {isShared && onVoteRemove ? (
            iVoted && partnerVoted ? (
              <span style={{ fontSize: '0.66rem', color: 'var(--subtle)' }}>removing…</span>
            ) : partnerVoted && !iVoted ? (
              <button style={{ ...voteBtn, color: 'var(--danger)' }} title="Both must agree to remove" onClick={() => onVoteRemove(expense)}>
                Confirm remove
              </button>
            ) : iVoted ? (
              <button style={{ ...voteBtn, color: 'var(--warn)' }} title="Cancel your removal request" onClick={() => onCancelVote(expense)}>
                Pending ✕
              </button>
            ) : (
              <button style={{ ...voteBtn, color: 'var(--subtle)' }} title="Request removal (needs both of you)" onClick={() => onVoteRemove(expense)}>
                Remove
              </button>
            )
          ) : onDelete ? (
            <button
              onClick={() => onDelete(expense)}
              style={{ background: 'none', border: 'none', color: 'var(--subtle)', cursor: 'pointer', fontSize: '1.1rem', padding: 0, lineHeight: 1 }}
              title="Delete"
            >
              ×
            </button>
          ) : null}
        </div>
        )}
      </div>
    </div>
  )
}
