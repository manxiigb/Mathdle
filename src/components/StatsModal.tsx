import { useEffect, useState } from 'react'
import { errMsg, getStatsData } from '../lib/api'
import { computeStats, type Stats } from '../lib/stats'
import { Modal } from './Modal'

function Box({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-night/60 p-3 text-center">
      <p className="font-display text-3xl font-semibold">{value}</p>
      <p className="text-xs text-dust">{label}</p>
    </div>
  )
}

type Props = { onClose: () => void; isGuest: boolean; onNeedAccount: () => void }

export function StatsModal({ onClose, isGuest, onNeedAccount }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getStatsData()
      .then(({ dates, results }) => setStats(computeStats(dates, results)))
      .catch((e) => setError(errMsg(e)))
  }, [])

  const dist = stats?.distribution ?? {}
  const cols = Math.max(5, ...Object.keys(dist).map(Number))
  const maxCount = Math.max(1, ...Object.values(dist))

  return (
    <Modal title="Estadísticas" onClose={onClose}>
      {error && <p className="text-red-400">{error}</p>}
      {!stats && !error && <p className="text-dust">Cargando…</p>}
      {stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-2">
            <Box value={stats.played} label="Jugados" />
            <Box value={`${stats.winRate}%`} label="Victorias" />
            <Box value={stats.current} label="Racha" />
            <Box value={stats.best} label="Mejor" />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-dust">Victorias por casilla</p>
            <div className="space-y-1.5">
              {Array.from({ length: cols }, (_, i) => i + 1).map((n) => {
                const count = dist[n] ?? 0
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-dust">{n}</span>
                    <div
                      className={`rounded px-2 py-0.5 text-right font-semibold ${
                        count > 0 ? 'bg-gold text-night' : 'bg-card-2 text-dust'
                      }`}
                      style={{ width: `${Math.max(10, (count / maxCount) * 100)}%` }}
                    >
                      {count}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {isGuest && (
            <p className="text-sm text-dust">
              Juegas como invitado: tus estadísticas viven solo en este navegador.{' '}
              <button className="underline" onClick={onNeedAccount}>Crear cuenta</button>
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}