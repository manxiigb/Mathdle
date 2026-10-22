import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function LoginModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      setBusy(false)
      if (error) return setError(error.message)
      if (!data.session) return setError('Cuenta creada. Revisa tu correo para confirmarla.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setBusy(false)
      if (error) return setError(error.message)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-xl font-bold">
          {mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
        </h2>
        <p className="mb-4 text-sm text-neutral-600">
          Guarda tu racha y tu historial. No es obligatorio para jugar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full rounded-lg border p-2.5 text-base"
            type="email" placeholder="correo" required autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-lg border p-2.5 text-base"
            type="password" placeholder="contraseña (mín. 6)" required minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit" disabled={busy}
            className="w-full rounded-lg bg-black py-2.5 font-medium text-white disabled:opacity-50"
          >
            {busy ? '...' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <button
          className="mt-3 w-full text-sm text-neutral-600 underline"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }}
        >
          {mode === 'signup' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Créala'}
        </button>
        <button className="mt-2 w-full text-sm text-neutral-500" onClick={onClose}>
          Seguir como invitado
        </button>
      </div>
    </div>
  )
}