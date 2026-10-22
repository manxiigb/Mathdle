import { supabase } from './supabase'
import type { DayResult } from './stats'
import type { Attempt, Problem, Solution, SubmitResult } from './types'

export function errMsg(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message)
  }
  return 'Algo salió mal'
}

async function hasSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

export function todayChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
}

export async function getToday(): Promise<Problem | null> {
  const { data, error } = await supabase
    .from('problems')
    .select('id, publish_date, title, statement, answer_type, max_attempts, has_hint')
    .order('publish_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  // Si el último publicado no es de hoy, no hay problema nuevo
  if (data && data.publish_date !== todayChile()) return null
  return data
}

export async function getProblemNumber(publishDate: string): Promise<number> {
  const { count, error } = await supabase
    .from('problems')
    .select('id', { count: 'exact', head: true })
    .lte('publish_date', publishDate)
  if (error) throw error
  return count ?? 1
}

export async function getAttempts(problemId: number): Promise<Attempt[]> {
  if (!(await hasSession())) return []
  const { data, error } = await supabase
    .from('attempts')
    .select('attempt_no, answer_given, correct, feedback')
    .eq('problem_id', problemId)
    .order('attempt_no')
  if (error) throw error
  return data ?? []
}

export async function getSolution(problemId: number): Promise<Solution | null> {
  const { data, error } = await supabase.rpc('get_solution', { p_problem_id: problemId })
  if (error) throw error
  return data
}

export async function revealHint(problemId: number): Promise<string> {
  const { data, error } = await supabase.rpc('reveal_hint', { p_problem_id: problemId })
  if (error) throw error
  return data
}

// Si ya reveló la pista, la recupera (la función no cobra dos veces)
export async function getHintState(problemId: number): Promise<string | null> {
  if (!(await hasSession())) return null
  const { data, error } = await supabase
    .from('hint_uses')
    .select('problem_id')
    .eq('problem_id', problemId)
    .maybeSingle()
  if (error) throw error
  return data ? revealHint(problemId) : null
}


async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

export async function submitAttempt(problemId: number, answer: string): Promise<SubmitResult> {
  await ensureSession()
  const { data, error } = await supabase.rpc('submit_attempt', {
    p_problem_id: problemId,
    p_answer: answer,
  })
  if (error) throw error
  return data
}

export async function getStatsData() {
  const p = await supabase.from('problems').select('publish_date').order('publish_date')
  if (p.error) throw p.error

  let results: DayResult[] = []
  if (await hasSession()) {
    const r = await supabase
      .from('daily_results')
      .select('publish_date, attempts, solved, finished')
    if (r.error) throw r.error
    results = (r.data ?? []) as DayResult[]
  }

  return { dates: (p.data ?? []).map((x) => x.publish_date as string), results }
}
