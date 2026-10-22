import { useEffect, useState } from 'react'
import {
  errMsg, getAttempts, getHintState, getProblemNumber, getSolution,
  getStatsData, getToday, todayChile, revealHint, submitAttempt,
} from '../lib/api'
import { buildShareText, shareResult } from '../lib/share'
import { computeStats } from '../lib/stats'
import type { Attempt, Problem, Solution } from '../lib/types'
import { LockIcon, ShareIcon } from './icons'
import { Keypad } from './Keypad'
import { RichText } from './RichText'

const HINT_UNLOCK = 2 // intentos hechos para desbloquear la pista (= llegar a la tercera casilla)

const TILE: Record<string, { sym: string; text: string; cls: string }> = {
  correct: { sym: '✓', text: 'Correcto', cls: 'bg-mint text-night' },
  too_high: { sym: '↓', text: 'Muy alto', cls: 'bg-gold text-night' },
  too_low: { sym: '↑', text: 'Muy bajo', cls: 'bg-gold text-night' },
  wrong: { sym: '✗', text: 'Incorrecto', cls: 'bg-ash text-chalk' },
}

type Props = { sessionKey: string; isGuest: boolean; onNeedAccount: () => void }

export function Game({ sessionKey, isGuest, onNeedAccount }: Props) {
  const [problem, setProblem] = useState<Problem | null>(null)
  const [number, setNumber] = useState(1)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [hint, setHint] = useState<string | null>(null)
  const [solution, setSolution] = useState<Solution | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [confirmHint, setConfirmHint] = useState(false)
  const [streak, setStreak] = useState<number | null>(null)
  const [shareMsg, setShareMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Carga inicial y al cambiar de cuenta (login / logout)
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setAnswer('')
      try {
        const p = await getToday()
        if (cancelled) return
        setProblem(p)
        if (!p) return
        const [a, h, n] = await Promise.all([
          getAttempts(p.id), getHintState(p.id), getProblemNumber(p.publish_date),
        ])
        if (cancelled) return
        setAttempts(a)
        setHint(h)
        setNumber(n)
        const done = a.some((x) => x.correct) || a.length >= p.max_attempts - (h ? 1 : 0)
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

  // Valores derivados (antes de cualquier return, por las reglas de los hooks)
  const effectiveMax = problem ? problem.max_attempts - (hint ? 1 : 0) : 0
  const solved = attempts.some((a) => a.correct)
  const finished = !!problem && (solved || attempts.length >= effectiveMax)

  // Al terminar el día, calcula la racha
  useEffect(() => {
    if (!finished) return
    let cancelled = false
    getStatsData()
      .then(({ dates, results }) => {
        if (!cancelled) setStreak(computeStats(dates, results).current)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [finished, sessionKey])

  // Si la página queda abierta pasada la medianoche, recarga al volver a ella
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && problem && problem.publish_date !== todayChile()) {
        window.location.reload()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [problem])

  async function submit() {
    const value = answer.trim()
    if (!problem || !value || value === '-' || sending || finished) return
    setSending(true)
    setError(null)
    try {
      const r = await submitAttempt(problem.id, value)
      setAttempts((prev) => [
        ...prev,
        { attempt_no: r.attempt_no, answer_given: value, correct: r.correct, feedback: r.feedback },
      ])
      if (r.finished && r.solution) setSolution({ answer: r.solution, explanation: r.explanation })
      setAnswer('')
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSending(false)
    }
  }

  async function handleReveal() {
    if (!problem) return
    setRevealing(true)
    setError(null)
    try {
      setHint(await revealHint(problem.id))
      setConfirmHint(false)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setRevealing(false)
    }
  }

  async function handleShare() {
    if (!problem) return
    const text = buildShareText({ number, problem, attempts, solved, hintUsed: hint !== null })
    const r = await shareResult(text)
    if (r === 'copied') setShareMsg('Resultado copiado al portapapeles')
    if (r === 'failed') setShareMsg('No se pudo compartir')
    if (r !== 'shared') setTimeout(() => setShareMsg(null), 2500)
  }

  if (loading) return <p className="py-10 text-center text-dust">Cargando…</p>
  if (error && !problem) return <p className="text-red-400">Error: {error}</p>
  if (!problem) return <p className="py-10 text-center text-dust">Hoy no hay problema nuevo. ¡Vuelve mañana!</p>

  const used = attempts.length
  const isNumber = problem.answer_type === 'number'
  const hintStatus = hint
    ? 'shown'
    : used < HINT_UNLOCK
      ? 'locked'
      : used <= problem.max_attempts - 2
        ? 'ready'
        : 'late'
  const dateLabel = new Date(problem.publish_date + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-5">
      {/* Enunciado */}
      <section className="rounded-3xl border border-edge bg-card p-5 shadow-lg shadow-black/20">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest">
          <span className="text-gold">Problema #{number}</span>
          <span className="text-dust">{dateLabel}</span>
        </div>
        {problem.title && <h2 className="font-display text-lg text-dust">{problem.title}</h2>}
        <div className="mt-1 whitespace-pre-line font-display text-[1.35rem] leading-snug">
          <RichText text={problem.statement} />
        </div>
      </section>

      {/* Casillas */}
      <section className="space-y-2">
        {Array.from({ length: problem.max_attempts }, (_, i) => {
          const a = attempts[i]
          if (a) {
            const t = TILE[a.feedback ?? 'wrong'] ?? TILE.wrong
            return (
              <div key={i} className={`anim-pop flex h-14 items-center justify-between rounded-2xl px-4 ${t.cls}`}>
                <span className="font-mono text-lg font-semibold">{a.answer_given}</span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="text-xl">{t.sym}</span>
                  {t.text}
                </span>
              </div>
            )
          }
          if (i >= effectiveMax) {
            return (
              <div key={i} className="anim-pop flex h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-ash/60 text-sm text-ash">
                <LockIcon className="h-4 w-4" /> Casilla usada en la pista
              </div>
            )
          }
          if (i === used && !finished) {
            return (
              <div
                key={i}
                className={`flex h-14 items-center rounded-2xl border-2 border-gold bg-card-2 px-4 ${sending ? 'opacity-60' : ''}`}
              >
                {isNumber ? (
                  <span className="flex items-center font-mono text-lg font-semibold">
                    {answer ? (
                      <>
                        {answer}
                        <span className="caret" />
                      </>
                    ) : (
                      <>
                        <span className="caret" />
                        <span className="ml-1 font-sans text-base font-normal text-dust">Tu respuesta</span>
                      </>
                    )}
                  </span>
                ) : (
                  <input
                    className="w-full bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-dust"
                    placeholder="Tu respuesta"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                    autoCapitalize="off" autoCorrect="off" autoComplete="off" enterKeyHint="send"
                  />
                )}
              </div>
            )
          }
          return <div key={i} className="h-14 rounded-2xl border border-edge/70 bg-card/40" />
        })}
      </section>

      {/* Pista */}
      {problem.has_hint && !finished && (
        <>
          {hintStatus === 'shown' && hint && (
            <section className="anim-pop rounded-2xl border border-gold/40 bg-gold/10 p-4 text-[15px]">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gold">Pista</p>
              <RichText text={hint} />
            </section>
          )}
          {hintStatus === 'locked' && (
            <p className="flex items-center justify-center gap-2 text-sm text-dust">
              <LockIcon className="h-4 w-4" /> La pista se desbloquea en la casilla 3
            </p>
          )}
          {hintStatus === 'ready' && !confirmHint && (
            <button
              onClick={() => setConfirmHint(true)}
              className="w-full rounded-2xl border border-gold/50 py-3 text-sm font-semibold text-gold active:bg-gold/10"
            >
              Revelar pista · −1 casilla
            </button>
          )}
          {hintStatus === 'ready' && confirmHint && (
            <div className="anim-pop rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">
              <p className="mb-3">Revelar la pista te cuesta <b>una casilla</b>. ¿Seguro?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleReveal} disabled={revealing}
                  className="flex-1 rounded-xl bg-gold py-2 font-semibold text-night disabled:opacity-50"
                >
                  Sí, revelar
                </button>
                <button onClick={() => setConfirmHint(false)} className="flex-1 rounded-xl bg-card-2 py-2">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      {/* Entrada de respuesta */}
      {!finished &&
        (isNumber ? (
          <Keypad value={answer} onChange={setAnswer} onSubmit={submit} disabled={sending} />
        ) : (
          <button
            onClick={submit}
            disabled={sending || !answer.trim()}
            className="h-14 w-full rounded-2xl bg-gold text-lg font-bold text-night disabled:opacity-40"
          >
            Enviar
          </button>
        ))}

      {/* Resultado */}
      {finished && (
        <section className="anim-pop space-y-4 rounded-3xl border border-edge bg-card p-5">
          <div>
            <p className="font-display text-2xl font-semibold">
              {solved ? '¡Resuelto!' : 'Se acabaron las casillas'}
            </p>
            <p className="text-sm text-dust">
              {solved
                ? `En ${attempts.length} de ${problem.max_attempts} casillas${hint ? ' (con pista)' : ''}.`
                : 'Mañana hay un problema nuevo.'}
            </p>
          </div>

          {streak !== null && streak > 0 && (
            <p className="rounded-xl bg-gold/10 px-3 py-2 text-sm font-semibold text-gold">
              🔥 Racha de {streak} {streak === 1 ? 'día' : 'días'}
            </p>
          )}

          {solution && (
            <div className="rounded-2xl bg-night/60 p-4 text-[15px]">
              <p className="text-xs uppercase tracking-widest text-dust">Respuesta</p>
              <p className="font-mono text-xl font-semibold">{solution.answer}</p>
              {solution.explanation && (
                <div className="mt-2 whitespace-pre-line text-dust">
                  <RichText text={solution.explanation} />
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold py-3 font-semibold text-night active:scale-[.99]"
          >
            <ShareIcon className="h-5 w-5" /> Compartir resultado
          </button>
          {shareMsg && <p className="text-center text-sm text-dust">{shareMsg}</p>}
        </section>
      )}

      {isGuest && attempts.length > 0 && (
        <p className="text-center text-sm text-dust">
          Juegas como invitado: si borras los datos del navegador o cambias de dispositivo, pierdes tu progreso.{' '}
          <button className="underline" onClick={onNeedAccount}>Crear cuenta</button>
        </p>
      )}
    </div>
  )
}