export type QuestionType = 'single' | 'multiple' | 'fill'
export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export type QuestionOption = {
  id: string
  label: string
}

export type MathQuestQuestion = {
  id: string
  type: QuestionType
  difficulty: QuestionDifficulty
  title: string
  prompt: string
  options?: QuestionOption[]
  answerOptionIds?: string[]
  answerPattern?: string
  answerHint?: string
  knowledgeTags: string[]
  explanation: string
  timeLimitSeconds: number
  points: number
}

export type AnswerResult = {
  correct: boolean
  message: string
}
