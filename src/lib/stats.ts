export type DayResult = {
  publish_date: string
  attempts: number
  solved: boolean
  finished: boolean
}

export type Stats = {
  played: number
  wins: number
  winRate: number
  current: number
  best: number
  distribution: Record<number, number>
}

export function computeStats(dates: string[], results: DayResult[]): Stats {
  const byDate = new Map(results.map((r) => [r.publish_date, r]))
  const sorted = [...dates].sort()

  // Mejor racha: días consecutivos resueltos
  let best = 0
  let run = 0
  for (const d of sorted) {
    if (byDate.get(d)?.solved) {
      run++
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }

  // Racha actual: hacia atrás desde hoy. Si hoy aún no termina, no rompe la racha.
  let i = sorted.length - 1
  if (i >= 0 && !byDate.get(sorted[i])?.finished) i--
  let current = 0
  for (; i >= 0; i--) {
    if (byDate.get(sorted[i])?.solved) current++
    else break
  }

  const played = results.filter((r) => r.finished).length
  const wins = results.filter((r) => r.solved).length
  const distribution: Record<number, number> = {}
  for (const r of results) {
    if (r.solved) distribution[r.attempts] = (distribution[r.attempts] ?? 0) + 1
  }

  return { played, wins, winRate: played ? Math.round((wins / played) * 100) : 0, current, best, distribution }
}