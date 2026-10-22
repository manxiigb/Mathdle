import type { ReactNode } from 'react'
import { LockIcon } from './icons'
import { Modal } from './Modal'

function Sample({ cls, children }: { cls: string; children: ReactNode }) {
  return (
    <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-base font-bold ${cls}`}>
      {children}
    </span>
  )
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Cómo se juega" onClose={onClose}>
      <div className="space-y-4 text-[15px] leading-relaxed text-dust">
        <p>
          Cada día hay <b className="text-chalk">un problema nuevo</b>. Resuélvelo y escribe tu
          respuesta: tienes un número limitado de casillas, una por intento.
        </p>

        <div className="space-y-2.5 rounded-2xl bg-night/60 p-4">
          <p className="flex items-center gap-3"><Sample cls="bg-mint text-night">✓</Sample> ¡Correcto!</p>
          <p className="flex items-center gap-3"><Sample cls="bg-gold text-night">↑</Sample> Muy bajo: la respuesta es mayor.</p>
          <p className="flex items-center gap-3"><Sample cls="bg-gold text-night">↓</Sample> Muy alto: la respuesta es menor.</p>
          <p className="flex items-center gap-3"><Sample cls="bg-ash text-chalk">✗</Sample> Incorrecto.</p>
        </div>

        <p>
          <b className="text-chalk">Pista.</b> Desde la tercera casilla puedes revelar una pista,
          pero tiene un precio: <b className="text-chalk">pierdes una casilla</b>{' '}
          <LockIcon className="inline h-4 w-4 align-text-bottom" />. Úsala con cabeza.
        </p>
        <p>
          <b className="text-chalk">Racha.</b> Resuelve cada día para mantenerla. Crea una cuenta
          para guardarla si cambias de dispositivo.
        </p>
        <p>El problema nuevo aparece a medianoche (hora de Chile).</p>
      </div>

      <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-gold py-3 font-semibold text-night">
        ¡A jugar!
      </button>
    </Modal>
  )
}