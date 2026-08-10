'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AdminLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const next = params.get('next') || '/admin'
        router.replace(next)
        router.refresh()
      } else {
        setError('Incorrect password.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
      <h2 style={{ marginTop: 0, textAlign: 'center' }}>Admin Login</h2>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="pw" style={{ display: 'block', marginBottom: 4 }}>Password</label>
          <input
            id="pw"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </div>
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-success" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: 80 }}>Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  )
}
