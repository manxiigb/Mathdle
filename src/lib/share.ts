import type { Attempt, Problem } from './types'

const EMOJI: Record<string, string> = {
  correct: '🟩',
  too_low: '🔼',
  too_high: '🔽',
  wrong: '⬛',
}

export function buildShareText(o: {
  number: number
  problem: Problem
  attempts: Attempt[]
  solved: boolean
  hintUsed: boolean
}) {
  const score = o.solved ? `${o.attempts.length}` : 'X'
  const row = o.attempts.map((a) => EMOJI[a.feedback ?? 'wrong'] ?? '⬛').join('')
  return `Mathdle #${o.number} ${score}/${o.problem.max_attempts}${o.hintUsed ? ' 💡' : ''}\n${row}\n${window.location.origin}`
}

export async function shareResult(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ text })
      return 'shared'
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'shared' // canceló
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}