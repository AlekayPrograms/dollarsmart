import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  async function handleSignIn() {
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Sign-in failed', err)
    }
  }

  return (
    <div className="page-center">
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💸 DollarSmart</h1>
      <p style={{ color: '#94A3B8', marginBottom: '2rem' }}>Couples budgeting, made simple.</p>
      <button className="btn btn-primary" onClick={handleSignIn}>
        Sign in with Google
      </button>
    </div>
  )
}
