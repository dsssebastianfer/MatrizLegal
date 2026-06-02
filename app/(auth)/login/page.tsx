'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const d = await res.json()
      setError(d.error === 'not_allowed'
        ? 'Tu correo no tiene acceso. Comunícate con el administrador.'
        : 'Error al iniciar sesión.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="text-3xl font-bold text-slate-800 mb-1">Matriz Legal</div>
        <p className="text-slate-500 text-sm">Ingresa tu correo para acceder</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="tu@empresa.cl"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
