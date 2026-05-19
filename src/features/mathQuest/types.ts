export type QuestionType = 'single' | 'multiple' | 'fill'

export type QuestionOption = {
  id: string
  label: string
}

export type MathQuestQuestion = {
  id: string
  type: QuestionType
  difficulty: 'easy' | 'medium' | 'hard'
  title: string
  prompt: string
  options?: QuestionOption[]
  answerOptionIds?: string[]
  answerPattern?: string
  answerHint?: string
  timeLimitSeconds: number
  points: number
}

export type AnswerResult = {
  correct: boolean
  message: string
}
