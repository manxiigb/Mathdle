export type Problem = {
  id: number
  publish_date: string
  title: string | null
  statement: string
  answer_type: 'number' | 'text'
  max_attempts: number
  has_hint: boolean
}

export type Attempt = {
  attempt_no: number
  answer_given: string
  correct: boolean
  feedback: string | null
}

export type SubmitResult = {
  attempt_no: number
  correct: boolean
  feedback: string
  finished: boolean
  attempts_left: number
  solution: string | null
  explanation: string | null
}

export type Solution = { answer: string; explanation: string | null }