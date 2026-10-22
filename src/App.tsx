import { useState } from 'react'
import { Game } from './components/Game'
import { LoginModal } from './components/LoginModal'
import { useAuth } from './lib/useAuth'
import { supabase } from './lib/supabase'

export default function App() {
  const { user, ready, isGuest } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  // Cambia solo con cuentas reales: crear el invitado no recarga el juego
  const sessionKey = user && !user.is_anonymous ? user.id : 'guest'

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mathle</h1>
        {isGuest ? (
          <button onClick={() => setShowLogin(true)} className="rounded-lg border px-3 py-1.5 text-sm">
            Iniciar sesión
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="max-w-[10rem] truncate text-neutral-600">{user?.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="rounded-lg border px-3 py-1.5">
              Salir
            </button>
          </div>
        )}
      </header>

      {ready && <Game sessionKey={sessionKey} isGuest={isGuest} onNeedAccount={() => setShowLogin(true)} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}