import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { cleanUsername, usernameError, usernameToEmail } from '../lib/username'
import { Modal } from './Modal'

const input =
  'w-full rounded-2xl border border-edge bg-night px-4 py-3 text-base text-chalk outline-none placeholder:text-dust focus:border-gold'

export function LoginModal({
  onClose,
  initialMode = 'signin',
}: {
  onClose: () => void
  initialMode?: 'signin' | 'signup'
}) {
  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'signup') {
      const invalid = usernameError(username)
      if (invalid) return setError(invalid)
    }

    setBusy(true)
    try {
      if (mode === 'signup') {
        const name = cleanUsername(username)
        const { data, error } = await supabase.auth.signUp({
          email: await usernameToEmail(name),
          password,
          options: { data: { username: name } },
        })
        if (error) {
          const taken = error.code === 'user_already_exists' || /already|registered/i.test(error.message)
          return setError(taken ? 'Ese nombre ya está en uso. Prueba con otro.' : error.message)
        }
        if (!data.session) return setError('No se pudo crear la cuenta. Inténtalo de nuevo.')
      } else {
        const id = username.trim()
        // Las cuentas antiguas creadas con correo siguen entrando con su correo
        const email = id.includes('@') ? id : await usernameToEmail(id)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          return setError(
            /invalid/i.test(error.message) ? 'Nombre o contraseña incorrectos.' : error.message
          )
        }
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'} onClose={onClose}>
      <p className="mb-4 text-sm text-dust">
        {mode === 'signup'
          ? 'Elige el nombre que quieras: será tu usuario y es único. Guarda tu racha y tu historial.'
          : 'Entra con tu nombre de usuario y tu contraseña.'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className={input}
          type="text"
          placeholder="Nombre de usuario"
          required
          maxLength={mode === 'signup' ? 20 : undefined}
          autoComplete="username"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className={input}
          type="password"
          placeholder="Contraseña (mín. 6)"
          required
          minLength={6}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-gold py-3 font-semibold text-night disabled:opacity-50"
        >
          {busy ? '…' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
        </button>
      </form>

      {mode === 'signup' && (
        <p className="mt-3 text-xs text-dust/80">
          Sin correo no hay recuperación de contraseña: guárdala bien.
        </p>
      )}

      {mode === 'signin' ? (
        <button
          className="mt-4 w-full rounded-2xl border border-edge py-3 text-sm font-semibold hover:bg-card-2"
          onClick={() => { setMode('signup'); setError(null) }}
        >
          ¿No tienes cuenta? Regístrate
        </button>
      ) : (
        <button
          className="mt-4 w-full text-sm text-dust underline"
          onClick={() => { setMode('signin'); setError(null) }}
        >
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      )}

      <button className="mt-2 w-full text-sm text-dust/70" onClick={onClose}>
        Seguir como invitado
      </button>
    </Modal>
  )
}