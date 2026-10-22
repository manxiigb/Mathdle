import { supabase } from './supabase'
import type { Attempt, Problem, Solution, SubmitResult } from './types'

export function errMsg(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message)
  }
  return 'Algo salió mal'
}

// La RLS solo deja ver problemas ya publicados, así que el más reciente es el de hoy
export async function getToday(): Promise<Problem | null> {
  const { data, error } = await supabase
    .from('problems')
    .select('id, publish_date, title, statement, answer_type, max_attempts')
    .order('publish_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getAttempts(problemId: number): Promise<Attempt[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select('attempt_no, answer_given, correct, feedback, hint')
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

// Crea el invitado anónimo solo cuando hace falta (primer intento)
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