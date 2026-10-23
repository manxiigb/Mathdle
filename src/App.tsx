import { useEffect, useState, type ReactNode } from 'react'
import { Game } from './components/Game'
import { HowToPlay } from './components/HowToPlay'
import { BulbIcon, ChartIcon, UserIcon } from './components/icons'
import { LoginModal } from './components/LoginModal'
import { Modal } from './components/Modal'
import { StatsModal } from './components/StatsModal'
import { supabase } from './lib/supabase'
import { useAuth } from './lib/useAuth'

type ModalName = 'howto' | 'stats' | 'login' | 'signup' | 'account' | null

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick} aria-label={label} title={label}
      className="rounded-full p-2.5 text-dust transition hover:bg-card hover:text-chalk active:scale-95"
    >
      {children}
    </button>
  )
}

export default function App() {
  const { user, ready, isGuest } = useAuth()
  const [modal, setModal] = useState<ModalName>(null)
  const close = () => setModal(null)

  // La primera vez que entra, se muestra cómo se juega
  useEffect(() => {
    try {
      if (!localStorage.getItem('mathle:howto')) {
        setModal('howto')
        localStorage.setItem('mathle:howto', '1')
      }
    } catch { /* sin localStorage: no pasa nada */ }
  }, [])

  const sessionKey = user && !user.is_anonymous ? user.id : 'guest'
  const displayName = (user?.user_metadata?.username as string | undefined) ?? user?.email

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
          <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
            <rect width="64" height="64" rx="14" className="fill-card-2" />
            <path
              d="M12 34 L19 29 L27 47 L41 15 H54"
              fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
              className="stroke-gold"
            />
          </svg>
          <span>Math<span className="text-gold">dle</span></span>
        </h1>
        <div className="flex items-center gap-0.5">
          <IconButton label="Cómo se juega" onClick={() => setModal('howto')}><BulbIcon /></IconButton>
          <IconButton label="Estadísticas" onClick={() => setModal('stats')}><ChartIcon /></IconButton>
          <IconButton
            label={isGuest ? 'Iniciar sesión' : 'Tu cuenta'}
            onClick={() => setModal(isGuest ? 'login' : 'account')}
          >
            <UserIcon />
          </IconButton>
        </div>
      </header>

      {ready && <Game sessionKey={sessionKey} isGuest={isGuest} onNeedAccount={() => setModal('signup')} />}

      {modal === 'howto' && <HowToPlay onClose={close} />}
      {modal === 'stats' && <StatsModal onClose={close} isGuest={isGuest} onNeedAccount={() => setModal('signup')} />}
      {modal === 'login' && <LoginModal onClose={close} />}
      {modal === 'signup' && <LoginModal onClose={close} initialMode="signup" />}
      {modal === 'account' && (
        <Modal title="Tu cuenta" onClose={close}>
          <p className="mb-4 text-dust">{displayName}</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); close() }}
            className="w-full rounded-2xl border border-edge py-3 font-semibold"
          >
            Cerrar sesión
          </button>
        </Modal>
      )}
    </div>
  )
}