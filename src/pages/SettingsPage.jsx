import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useExpenses } from '../hooks/useExpenses.js'
import { useMonthlyTargets } from '../hooks/useMonthlyTargets.js'
import { CATEGORIES } from '../lib/categories.js'
import { expensesToCsv } from '../lib/csv.js'
import ConnectBankButton from '../components/ConnectBankButton.jsx'
import HouseholdInvite from '../components/HouseholdInvite.jsx'
import InstallAppButton from '../components/InstallAppButton.jsx'
import NotificationSettings from '../components/NotificationSettings.jsx'

export default function SettingsPage() {
  const { user, signOutUser } = useAuth()
  const { expenses } = useExpenses()
  const { setPersonalTarget } = useMonthlyTargets()
  const navigate = useNavigate()
  const [targets, setTargets] = useState({})

  useEffect(() => {
    if (!user) return
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setTargets(snap.exists() ? (snap.data().monthlyTargets ?? {}) : {})
    })
  }, [user])

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
    <div className="page-center" style={{ justifyContent: 'flex-start', paddingTop: '2rem', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 420, alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Home</button>
      </div>

      <InstallAppButton />

      <HouseholdInvite />

      <div style={{ width: '100%', maxWidth: 420 }}>
        <h3 style={{ fontSize: '1rem', color: '#CBD5E1' }}>Monthly targets (personal)</h3>
        {CATEGORIES.map((cat) => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ width: 28 }}>{cat.emoji}</span>
            <span style={{ flex: 1, fontSize: '0.9rem' }}>{cat.label}</span>
            <input
              // defaultValue only applies on mount; remount via key when the
              // saved target arrives async so loaded values actually display.
              key={`${cat.id}:${targets[cat.id] ?? ''}`}
              type="number"
              inputMode="decimal"
              defaultValue={targets[cat.id] ?? ''}
              placeholder="—"
              onBlur={(e) => {
                const v = parseFloat(e.target.value)
                if (!Number.isNaN(v)) setPersonalTarget(cat.id, v)
              }}
              style={{
                width: 90, padding: '0.4rem', borderRadius: 8, textAlign: 'right',
                background: '#1E293B', border: '1px solid #334155', color: '#F8FAFC',
              }}
            />
          </div>
        ))}
      </div>

      <NotificationSettings />

      <div style={{ width: '100%', maxWidth: 420 }}>
        <h3 style={{ fontSize: '1rem', color: '#CBD5E1' }}>Bank connection</h3>
        <ConnectBankButton />
      </div>

      <button className="btn btn-secondary" style={{ width: '100%', maxWidth: 420 }} onClick={handleExport}>
        Export all expenses as CSV
      </button>

      <button className="btn btn-secondary" style={{ width: '100%', maxWidth: 420 }} onClick={() => signOutUser()}>
        Sign out
      </button>
    </div>
  )
}
