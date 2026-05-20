import type { AnswerResult, MathQuestQuestion, QuestionDifficulty } from './types'

export function shuffleQuestions(questions: MathQuestQuestion[]) {
  return [...questions]
    .map((question) => ({ question, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ question }) => question)
}

export function getKnowledgeTags(questions: MathQuestQuestion[]) {
  return Array.from(new Set(questions.flatMap((question) => question.knowledgeTags))).sort((left, right) =>
    left.localeCompare(right, 'zh-Hans-CN'),
  )
}

export function filterQuestions(
  questions: MathQuestQuestion[],
  selectedTags: string[],
  selectedDifficulties: QuestionDifficulty[],
) {
  const selectedTagSet = new Set(selectedTags)
  const selectedDifficultySet = new Set(selectedDifficulties)

  return questions.filter((question) => {
    const matchesTag =
      selectedTagSet.size === 0 || question.knowledgeTags.some((tag) => selectedTagSet.has(tag))
    const matchesDifficulty =
      selectedDifficultySet.size === 0 || selectedDifficultySet.has(question.difficulty)

    return matchesTag && matchesDifficulty
  })
}

export function getDifficultyLabel(question: MathQuestQuestion) {
  if (question.difficulty === 'hard') return '挑战'
  if (question.difficulty === 'medium') return '进阶'
  return '基础'
}

export function getCorrectAnswerText(question: MathQuestQuestion) {
  if (question.type === 'fill') {
    return question.answerPattern
      ?.replace(/^\^/, '')
      .replace(/\$$/, '')
      .replace(/^\(\?:/, '')
      .replace(/\)$/, '')
      .replaceAll('|', ' 或 ')
      .replaceAll('\\.', '.')
      .replaceAll('\\/', '/')
      ?? '见解析'
  }

  const answerIds = new Set(question.answerOptionIds ?? [])
  return question.options
    ?.filter((option) => answerIds.has(option.id))
    .map((option) => option.label)
    .join('、') || '见解析'
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
