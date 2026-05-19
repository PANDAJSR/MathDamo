import type { AnswerResult, MathQuestQuestion } from './types'

export function shuffleQuestions(questions: MathQuestQuestion[]) {
  return [...questions]
    .map((question) => ({ question, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ question }) => question)
}

export function getDifficultyLabel(question: MathQuestQuestion) {
  if (question.difficulty === 'hard') return '挑战'
  if (question.difficulty === 'medium') return '进阶'
  return '基础'
}

export function evaluateChoiceAnswer(
  question: MathQuestQuestion,
  selectedOptionIds: string[],
): AnswerResult {
  const expected = [...(question.answerOptionIds ?? [])].sort()
  const selected = [...selectedOptionIds].sort()
  const correct =
    expected.length === selected.length &&
    expected.every((optionId, index) => optionId === selected[index])

  return {
    correct,
    message: correct
      ? `答对了，获得 ${question.points} 分。`
      : `选错了，扣除 ${question.points} 分。`,
  }
}

export function evaluateFillAnswer(question: MathQuestQuestion, value: string): AnswerResult {
  const normalizedValue = value.trim()
  const pattern = question.answerPattern ? new RegExp(question.answerPattern, 'i') : /^$/
  const correct = pattern.test(normalizedValue)

  return {
    correct,
    message: correct
      ? `答对了，获得 ${question.points} 分。`
      : `答案不匹配，扣除 ${question.points} 分。`,
  }
}
