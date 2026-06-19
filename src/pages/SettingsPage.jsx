import { useState } from 'react'
import PageWrapper from '../components/PageWrapper.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useMonthlyTargets } from '../hooks/useMonthlyTargets.js'
import { useHousehold } from '../hooks/useHousehold.js'
import { useRecurring } from '../hooks/useRecurring.js'
import { deleteRecurring, setRecurringActive } from '../lib/recurringStore.js'
import { CATEGORIES, getCategory } from '../lib/categories.js'
import { expensesToCsv } from '../lib/csv.js'
import ConnectBankButton from '../components/ConnectBankButton.jsx'
import BankAccounts from '../components/BankAccounts.jsx'
import HouseholdInvite from '../components/HouseholdInvite.jsx'
import HouseholdMembers from '../components/HouseholdMembers.jsx'
import InstallAppButton from '../components/InstallAppButton.jsx'
import NotificationSettings from '../components/NotificationSettings.jsx'
import { leaveHousehold } from '../lib/householdStore.js'

function Section({ label, children }) {
  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      {label && <p className="section-label">{label}</p>}
      <div className="card" style={{ padding: '0.25rem 0', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ children, style }) {
  return (
    <div style={{ padding: '0.875rem 1.125rem', borderBottom: '1px solid var(--border)', ...style }}>
      {children}
    </div>
  )
}

function LastRow({ children, style }) {
  return (
    <div style={{ padding: '0.75rem 1.125rem', ...style }}>
      {children}
    </div>
  )
}

// A list of per-category monthly target inputs. `targets` is a map of
// categoryId -> amount; `onSet(categoryId, amount)` persists a single value.
function TargetList({ targets, onSet }) {
  return (
    <>
      {CATEGORIES.map((cat, i) => {
        const isLast = i === CATEGORIES.length - 1
        const Wrap = isLast ? LastRow : Row
        return (
          <Wrap key={cat.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{cat.emoji}</span>
              <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--muted)' }}>{cat.label}</span>
              <input
                key={`${cat.id}:${targets[cat.id] ?? ''}`}
                type="number"
                inputMode="decimal"
                defaultValue={targets[cat.id] ? targets[cat.id] : ''}
                placeholder="—"
                onBlur={(e) => {
                  const raw = e.target.value.trim()
                  // Blanking the field clears the target (0 = "no target").
                  if (raw === '') { onSet(cat.id, 0); return }
                  const v = parseFloat(raw)
                  if (!Number.isNaN(v)) onSet(cat.id, v)
                }}
                style={{
                  width: 80, padding: '0.35rem 0.5rem', borderRadius: 8, textAlign: 'right',
                  background: 'var(--surface-2, #243148)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.9rem',
                }}
              />
            </div>
          </Wrap>
        )
      })}
    </>
  )
}

export default function SettingsPage() {
  const { user, signOutUser } = useAuth()
  const { expenses } = useExpenses()
  const { personalTargets, setPersonalTarget } = useMonthlyTargets()
  const { householdId } = useHousehold()
  const { recurring } = useRecurring()
  const [leavingHousehold, setLeavingHousehold] = useState(false)

  async function handleLeaveHousehold() {
    if (!window.confirm("Leave this household? You'll lose access to shared expenses and need to create or join a new one.")) return
    setLeavingHousehold(true)
    try {
      await leaveHousehold(user.uid, householdId)
    } catch (err) {
      console.error('Failed to leave household', err)
      setLeavingHousehold(false)
    }
  }

  function handleExport() {
    const csv = expensesToCsv(expenses)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dollarsmart-expenses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageWrapper className="page-center" style={{ justifyContent: 'flex-start', gap: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h2>
      </div>

      <InstallAppButton />

      {/* Household */}
      <div style={{ width: '100%', maxWidth: 440 }}>
        <p className="section-label">Household</p>
        <div className="card">
          <HouseholdInvite />
        </div>
      </div>

      {householdId && <HouseholdMembers />}

      {/* Monthly targets */}
      <Section label="Monthly targets">
        <TargetList targets={personalTargets} onSet={setPersonalTarget} />
      </Section>

      {/* Recurring expenses */}
      {recurring.length > 0 && (
        <Section label="Recurring expenses">
          {recurring.map((r, i) => {
            const cat = getCategory(r.categoryId)
            const isLast = i === recurring.length - 1
            const Wrap = isLast ? LastRow : Row
            return (
              <Wrap key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem', opacity: r.active === false ? 0.4 : 1 }}>{cat.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0, opacity: r.active === false ? 0.5 : 1 }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                      ${Number(r.amount).toFixed(2)} · {r.merchantName || cat.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--subtle)' }}>
                      Day {r.dayOfMonth} each month{r.active === false ? ' · paused' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => setRecurringActive(r.id, r.active === false)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    {r.active === false ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Remove this recurring expense?')) deleteRecurring(r.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--subtle)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </Wrap>
            )
          })}
        </Section>
      )}

      {/* Notifications */}
      <div style={{ width: '100%', maxWidth: 440 }}>
        <NotificationSettings />
      </div>

      {/* Bank */}
      <Section label="Bank connection">
        <Row>
          <ConnectBankButton />
        </Row>
        <LastRow>
          <BankAccounts />
        </LastRow>
      </Section>

      {/* Data */}
      <Section label="Data">
        <Row>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', background: 'none', border: 'none', padding: 0, fontWeight: 500, color: 'var(--muted)', fontSize: '0.9rem' }}
            onClick={handleExport}
          >
            Export all expenses as CSV
          </button>
        </Row>
        <LastRow>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', justifyContent: 'flex-start', background: 'none', border: 'none', padding: 0, fontWeight: 500, color: 'var(--danger)', fontSize: '0.9rem' }}
            onClick={handleLeaveHousehold}
            disabled={leavingHousehold || !householdId}
          >
            {leavingHousehold ? 'Leaving…' : 'Leave household'}
          </button>
        </LastRow>
      </Section>

      {/* Account */}
      <div style={{ width: '100%', maxWidth: 440, paddingBottom: '0.5rem' }}>
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => signOutUser()}>
          Sign out
        </button>
      </div>
    </PageWrapper>
  )
}
