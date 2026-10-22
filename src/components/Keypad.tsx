import { useEffect } from 'react'
import { BackspaceIcon } from './icons'

type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', ',']

export function Keypad({ value, onChange, onSubmit, disabled }: Props) {
  function press(k: string) {
    if (disabled) return
    if (k === '±') {
      onChange(value.startsWith('-') ? value.slice(1) : '-' + value)
      return
    }
    if (k === ',') {
      if (value.includes(',')) return
      onChange(value === '' || value === '-' ? value + '0,' : value + ',')
      return
    }
    if (value.replace('-', '').length >= 12) return
    onChange(value + k)
  }

  // Teclado físico (computador). Se ignora si hay un modal abierto o se escribe en un campo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (document.querySelector('[role="dialog"]')) return
      if ((e.target as HTMLElement | null)?.closest('input, textarea, button')) return

      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === '-') press('±')
      else if (e.key === ',' || e.key === '.') press(',')
      else if (e.key === 'Backspace') onChange(value.slice(0, -1))
      else if (e.key === 'Enter') onSubmit()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const key =
    'h-14 rounded-2xl bg-card-2 text-xl font-semibold transition active:scale-95 active:bg-edge disabled:opacity-40'

  return (
    <div className="select-none space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button key={k} onClick={() => press(k)} disabled={disabled} className={key}>
            {k === '±' ? '+/−' : k}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_2fr] gap-2">
        <button
          onClick={() => onChange(value.slice(0, -1))}
          disabled={disabled}
          aria-label="Borrar"
          className={`${key} flex items-center justify-center`}
        >
          <BackspaceIcon />
        </button>
        <button
          onClick={onSubmit}
          disabled={disabled || !value || value === '-'}
          className="h-14 rounded-2xl bg-gold text-lg font-bold text-night transition active:scale-95 disabled:opacity-40"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}