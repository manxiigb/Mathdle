import { useEffect, useState, type FormEvent } from 'react'
import { errMsg, getAttempts, getSolution, getToday, submitAttempt } from '../lib/api'
import type { Attempt, Problem, Solution } from '../lib/types'
import { RichText } from './RichText'

const FEEDBACK: Record<string, { label: string; cls: string }> = {
  correct: { label: '✓ Correcto', cls: 'bg-green-500 text-white border-green-500' },
  too_high: { label: '↓ Muy alto', cls: 'bg-amber-400 text-black border-amber-400' },
  too_low: { label: '↑ Muy bajo', cls: 'bg-amber-400 text-black border-amber-400' },
  wrong: { label: '✗ Incorrecto', cls: 'bg-neutral-300 text-black border-neutral-300' },
}

type Props = { sessionKey: string; isGuest: boolean; onNeedAccount: () => void }

export function Game({ sessionKey, isGuest, onNeedAccount }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [solution, setSolution] = useState<Solution | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recarga solo cuando cambia la cuenta (login / logout), no al crearse el invitado
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const p = await getToday()
        if (cancelled) return
        setProblem(p)
        if (!p) return
        const a = await getAttempts(p.id)
        if (cancelled) return
        setAttempts(a)
        const done = a.some((x) => x.correct) || a.length >= p.max_attempts
        const sol = done ? await getSolution(p.id) : null
        if (!cancelled) setSolution(sol)
      } catch (err) {
        if (!cancelled) setError(errMsg(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionKey])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = answer.trim()
    if (!problem || !value || sending) return
    setSending(true)
    setError(null)
    try {
      const r = await submitAttempt(problem.id, value)
      setAttempts((prev) => [
        ...prev,
        { attempt_no: r.attempt_no, answer_given: value, correct: r.correct, feedback: r.feedback, hint: r.hint },
      ])
      if (r.finished && r.solution) setSolution({ answer: r.solution, explanation: r.explanation })
      setAnswer('')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="text-neutral-500">Cargando…</p>
  if (error && !problem) return <p className="text-red-600">Error: {error}</p>
  if (!problem) return <p>Hoy todavía no hay problema. Vuelve más tarde.</p>

  const solved = attempts.some((a) => a.correct)
  const finished = solved || attempts.length >= problem.max_attempts
  const hints = attempts.filter((a) => a.hint).map((a) => a.hint as string)
  const dateLabel = new Date(problem.publish_date + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-5">
      <section>
        <p className="text-sm capitalize text-neutral-500">{dateLabel}</p>
        {problem.title && <h2 className="text-lg font-semibold">{problem.title}</h2>}
        <div className="mt-2 whitespace-pre-line text-lg leading-relaxed">
          <RichText text={problem.statement} />
        </div>
      </section>

      <section className="space-y-2">
        {Array.from({ length: problem.max_attempts }, (_, i) => {
          const a = attempts[i]
          if (!a) return <div key={i} className="h-12 rounded-lg border-2 border-dashed border-neutral-200" />
          const f = FEEDBACK[a.feedback ?? 'wrong'] ?? FEEDBACK.wrong
          return (
            <div key={i} className={`flex h-12 items-center justify-between rounded-lg border px-4 ${f.cls}`}>
              <span className="font-mono">{a.answer_given}</span>
              <span className="text-sm font-medium">{f.label}</span>
            </div>
          )
        })}
      </section>

      {hints.length > 0 && !finished && (
        <section className="rounded-lg bg-blue-50 p-3 text-sm">
          {hints.map((h, i) => (
            <p key={i}>💡 <RichText text={h} /></p>
          ))}
        </section>
      )}

      {!finished && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-lg border p-3 text-base"
            placeholder="Tu respuesta"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoCapitalize="off" autoCorrect="off" autoComplete="off"
            enterKeyHint="send"
          />
          <button
            type="submit" disabled={sending || !answer.trim()}
            className="rounded-lg bg-black px-5 font-medium text-white disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {finished && (
        <section className="space-y-2 rounded-lg bg-neutral-100 p-4">
          <p className="font-semibold">
            {solved
              ? `¡Lo lograste en ${attempts.length} intento${attempts.length > 1 ? 's' : ''}!`
              : 'Se acabaron los intentos.'}
          </p>
          {solution && (
            <>
              <p>Respuesta: <span className="font-mono font-semibold">{solution.answer}</span></p>
              {solution.explanation && (
                <div className="whitespace-pre-line text-sm"><RichText text={solution.explanation} /></div>
              )}
            </>
          )}
          <p className="text-sm text-neutral-500">Mañana hay un problema nuevo.</p>
        </section>
      )}

      {isGuest && attempts.length > 0 && (
        <p className="text-sm text-neutral-600">
          Juegas como invitado: si borras los datos del navegador o cambias de dispositivo, pierdes tu progreso.{' '}
          <button className="underline" onClick={onNeedAccount}>Crear cuenta</button>
        </p>
      )}
    </div>
  )
}