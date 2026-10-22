import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './icons'

type Props = { title: string; onClose: () => void; children: ReactNode }

export function Modal({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-sheet max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-edge bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 text-dust hover:bg-card-2 hover:text-chalk"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}