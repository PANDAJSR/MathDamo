import { Button, Modal, Progress, Statistic, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import './MathQuest.css'
import {
  evaluateChoiceAnswer,
  evaluateFillAnswer,
  filterQuestionsByTags,
  getCorrectAnswerText,
  getDifficultyLabel,
  getKnowledgeTags,
  shuffleQuestions,
} from './mathQuest/game'
import { MathQuestStart } from './mathQuest/MathQuestStart'
import { NumberPad } from './mathQuest/NumberPad'
import questionBank from './mathQuest/questions.json'
import type { MathQuestQuestion } from './mathQuest/types'

type GamePhase = 'ready' | 'playing' | 'feedback' | 'finished'
type FeedbackTone = 'success' | 'danger'

const typedQuestionBank = questionBank as MathQuestQuestion[]
const feedbackDelayMs = 1300

export function MathQuest() {
  const [selectedKnowledgeTags, setSelectedKnowledgeTags] = useState<string[]>([])
  const [phase, setPhase] = useState<GamePhase>('ready')
  const [questions, setQuestions] = useState<MathQuestQuestion[]>(() => shuffleQuestions(typedQuestionBank))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [fillAnswer, setFillAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimitSeconds ?? 0)
  const [feedback, setFeedback] = useState({ tone: 'success' as FeedbackTone, text: '' })
  const [wrongReview, setWrongReview] = useState<{ answer: string; explanation: string } | null>(null)

  const currentQuestion = questions[questionIndex]
  const availableKnowledgeTags = useMemo(() => getKnowledgeTags(typedQuestionBank), [])
  const filteredQuestionBank = useMemo(
    () => filterQuestionsByTags(typedQuestionBank, selectedKnowledgeTags),
    [selectedKnowledgeTags],
  )
  const answeredCount = phase === 'finished' ? questions.length : questionIndex
  const progressPercent = Math.round((answeredCount / questions.length) * 100)
  const isMultipleChoice = currentQuestion?.type === 'multiple'
  const canSubmitChoice = selectedOptionIds.length > 0
  const canSubmitFill = fillAnswer.trim().length > 0

  const resetForQuestion = useCallback((nextQuestion: MathQuestQuestion) => {
    setSelectedOptionIds([])
    setFillAnswer('')
    setTimeLeft(nextQuestion.timeLimitSeconds)
  }, [])

  const startGame = () => {
    const nextQuestions = shuffleQuestions(filteredQuestionBank)
    if (nextQuestions.length === 0) return

    setQuestions(nextQuestions)
    setQuestionIndex(0)
    setScore(0)
    setFeedback({ tone: 'success', text: '' })
    setWrongReview(null)
    resetForQuestion(nextQuestions[0])
    setPhase('playing')
  }

  const moveToNextQuestion = useCallback(() => {
    setQuestionIndex((currentIndex) => {
      const nextIndex = currentIndex + 1
      const nextQuestion = questions[nextIndex]

      if (!nextQuestion) {
        setPhase('finished')
        return currentIndex
      }

      resetForQuestion(nextQuestion)
      setPhase('playing')
      return nextIndex
    })
  }, [questions, resetForQuestion])

  const continueAfterReview = useCallback(() => {
    setWrongReview(null)
    moveToNextQuestion()
  }, [moveToNextQuestion])

  const resolveAnswer = useCallback(
    (correct: boolean, message: string) => {
      if (!currentQuestion || phase !== 'playing') return

      const delta = correct ? currentQuestion.points : -currentQuestion.points
      setScore((currentScore) => currentScore + delta)
      setFeedback({
        tone: correct ? 'success' : 'danger',
        text: correct ? message : `${message} 先别急，下一题抢回来。`,
      })
      setPhase('feedback')

      if (correct) {
        window.setTimeout(moveToNextQuestion, feedbackDelayMs)
        return
      }

      setWrongReview({
        answer: getCorrectAnswerText(currentQuestion),
        explanation: currentQuestion.explanation,
      })
    },
    [currentQuestion, moveToNextQuestion, phase],
  )

  const submitChoice = useCallback(() => {
    if (!currentQuestion || selectedOptionIds.length === 0) return
    const result = evaluateChoiceAnswer(currentQuestion, selectedOptionIds)
    resolveAnswer(result.correct, result.message)
  }, [currentQuestion, resolveAnswer, selectedOptionIds])

  const submitFill = useCallback(() => {
    if (!currentQuestion || fillAnswer.trim().length === 0) return
    const result = evaluateFillAnswer(currentQuestion, fillAnswer)
    resolveAnswer(result.correct, result.message)
  }, [currentQuestion, fillAnswer, resolveAnswer])

  useEffect(() => {
    if (phase !== 'playing') return undefined

    const timer = window.setInterval(() => {
      setTimeLeft((currentTimeLeft) => {
        if (currentTimeLeft <= 1) {
          window.clearInterval(timer)
          resolveAnswer(false, `时间到，扣除 ${currentQuestion.points} 分。`)
          return 0
        }

        return currentTimeLeft - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [currentQuestion, phase, resolveAnswer])

  useEffect(() => {
    if (phase !== 'playing' || currentQuestion?.type !== 'fill') return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^[0-9.-]$/.test(event.key)) {
        event.preventDefault()
        setFillAnswer((currentValue) => currentValue + event.key)
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        setFillAnswer((currentValue) => currentValue.slice(0, -1))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        submitFill()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, phase, submitFill])

  const timePercent = useMemo(() => {
    if (!currentQuestion) return 0
    return Math.round((timeLeft / currentQuestion.timeLimitSeconds) * 100)
  }, [currentQuestion, timeLeft])

  const toggleOption = (optionId: string) => {
    if (!currentQuestion || phase !== 'playing') return

    if (currentQuestion.type === 'single') {
      setSelectedOptionIds([optionId])
      return
    }

    setSelectedOptionIds((currentIds) =>
      currentIds.includes(optionId)
        ? currentIds.filter((currentId) => currentId !== optionId)
        : [...currentIds, optionId],
    )
  }

  if (phase === 'ready' || !currentQuestion) {
    return (
      <MathQuestStart
        availableTags={availableKnowledgeTags}
        playableQuestionCount={filteredQuestionBank.length}
        selectedTags={selectedKnowledgeTags}
        onSelectedTagsChange={setSelectedKnowledgeTags}
        onStart={startGame}
      />
    )
  }

  if (phase === 'finished') {
    return (
      <MathQuestStart
        availableTags={availableKnowledgeTags}
        playableQuestionCount={filteredQuestionBank.length}
        selectedTags={selectedKnowledgeTags}
        onSelectedTagsChange={setSelectedKnowledgeTags}
        onStart={startGame}
        score={score}
        completedQuestionCount={questions.length}
      />
    )
  }

  return (
    <section className={`math-quest ${feedback.tone === 'danger' && phase === 'feedback' ? 'is-failed' : ''}`}>
      <header className="math-quest__topbar">
        <div>
          <span className="math-quest__eyebrow">趣味数学闯关</span>
          <Typography.Title level={2}>{currentQuestion.title}</Typography.Title>
        </div>
        <div className="math-quest__stats">
          <Statistic title="得分" value={score} />
          <Statistic title="题目" value={questionIndex + 1} suffix={`/${questions.length}`} />
          <Statistic title="剩余" value={timeLeft} suffix="秒" />
        </div>
      </header>

      <Progress percent={progressPercent} showInfo={false} />

      <main className="math-quest__board">
        <section className="math-quest__question">
          <div className="math-quest__meta">
            <span>{getDifficultyLabel(currentQuestion)}</span>
            <span>{currentQuestion.points} 分</span>
            <span>{currentQuestion.type === 'fill' ? '填空' : currentQuestion.type === 'multiple' ? '多选' : '单选'}</span>
            {currentQuestion.knowledgeTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="math-quest__prompt">{currentQuestion.prompt}</div>
          <Progress
            percent={timePercent}
            strokeColor={timePercent <= 25 ? '#ef4444' : '#16a34a'}
            showInfo={false}
          />
        </section>

        {currentQuestion.type === 'fill' ? (
          <section className="math-quest__fill">
            <div className="math-quest__answer-display" aria-label="填空答案">
              {fillAnswer || currentQuestion.answerHint || '输入答案'}
            </div>
            <NumberPad
              disabled={phase !== 'playing'}
              onInput={(value) => setFillAnswer((currentValue) => currentValue + value)}
              onBackspace={() => setFillAnswer((currentValue) => currentValue.slice(0, -1))}
              onClear={() => setFillAnswer('')}
            />
            <Button
              className="math-quest__submit"
              type="primary"
              disabled={phase !== 'playing' || !canSubmitFill}
              onClick={submitFill}
            >
              提交答案
            </Button>
          </section>
        ) : (
          <section className="math-quest__options">
            {currentQuestion.options?.map((option, index) => {
              const selected = selectedOptionIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  className={`math-quest__option ${selected ? 'is-selected' : ''}`}
                  disabled={phase !== 'playing'}
                  onClick={() => toggleOption(option.id)}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong>{option.label}</strong>
                </button>
              )
            })}
            <Button
              className="math-quest__submit"
              type="primary"
              disabled={phase !== 'playing' || !canSubmitChoice}
              onClick={submitChoice}
            >
              {isMultipleChoice ? '提交多选' : '确认选择'}
            </Button>
          </section>
        )}
      </main>

      {phase === 'feedback' && (
        <div className={`math-quest__feedback math-quest__feedback--${feedback.tone}`}>
          {feedback.tone === 'danger' ? '挑战受阻' : '闯关成功'}
          <span>{feedback.text}</span>
        </div>
      )}

      <Modal
        open={Boolean(wrongReview)}
        title="正确答案和解析"
        okText="继续闯关"
        cancelButtonProps={{ style: { display: 'none' } }}
        closable={false}
        maskClosable={false}
        onOk={continueAfterReview}
      >
        <div className="math-quest__review">
          <div>
            <strong>正确答案</strong>
            <span>{wrongReview?.answer}</span>
          </div>
          <div>
            <strong>为什么是这个答案</strong>
            <p>{wrongReview?.explanation}</p>
          </div>
        </div>
      </Modal>
    </section>
  )
}
