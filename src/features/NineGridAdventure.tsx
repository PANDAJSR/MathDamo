import { Button, Input, Modal, Tag } from 'antd'
import { useMemo, useRef, useState } from 'react'
import {
  evaluateChoiceAnswer,
  evaluateFillAnswer,
  getDifficultyLabel,
} from './mathQuest/game'
import questionBank from './mathQuest/questions.json'
import type { MathQuestQuestion } from './mathQuest/types'
import './NineGridAdventure.css'

const GRID_SIZE = 3
const INITIAL_HP = 3
const MOVE_DELAY_MS = 620
const FEEDBACK_DELAY_MS = 900

type GameStatus = 'playing' | 'won' | 'lost'
type Feedback = 'correct' | 'wrong' | null

const typedQuestionBank = questionBank as MathQuestQuestion[]
const advancedQuestionBank = typedQuestionBank.filter((question) => question.difficulty !== 'easy')
const hardQuestionBank = typedQuestionBank.filter((question) => question.difficulty === 'hard')

const getQuestionForCell = (cell: number, score: number) => {
  const preferredBank = cell >= 7 && hardQuestionBank.length > 0 ? hardQuestionBank : advancedQuestionBank
  const bank = preferredBank.length > 0 ? preferredBank : typedQuestionBank
  const scoreStep = Math.max(0, Math.floor(score / 10))
  return bank[(cell * 17 + scoreStep * 11) % bank.length]
}

const getCellPoint = (cell: number) => {
  const index = cell - 1
  return {
    x: (index % GRID_SIZE) * 100,
    y: Math.floor(index / GRID_SIZE) * 100,
  }
}

export function NineGridAdventure() {
  const feedbackTimerRef = useRef<number | null>(null)
  const [position, setPosition] = useState(1)
  const [score, setScore] = useState(0)
  const [hp, setHp] = useState(INITIAL_HP)
  const [completedCells, setCompletedCells] = useState<number[]>([])
  const [status, setStatus] = useState<GameStatus>('playing')
  const [moving, setMoving] = useState(false)
  const [questionOpen, setQuestionOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestQuestion | null>(null)
  const [pendingMiddleCell, setPendingMiddleCell] = useState(1)
  const [fillAnswer, setFillAnswer] = useState('')
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [hpBump, setHpBump] = useState(false)

  const playerPoint = useMemo(() => getCellPoint(position), [position])
  const canMove = status === 'playing' && !moving && !questionOpen

  const resetGame = () => {
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    setPosition(1)
    setScore(0)
    setHp(INITIAL_HP)
    setCompletedCells([])
    setStatus('playing')
    setMoving(false)
    setQuestionOpen(false)
    setCurrentQuestion(null)
    setPendingMiddleCell(1)
    setFillAnswer('')
    setSelectedOptionIds([])
    setFeedback(null)
    setHpBump(false)
  }

  const startMove = () => {
    if (!canMove) return

    const middleCell = Math.min(9, position + 1)
    const targetCell = Math.min(9, position + 2)
    setPendingMiddleCell(middleCell)
    setCurrentQuestion(getQuestionForCell(targetCell, score))
    setMoving(true)
    setPosition(targetCell)

    window.setTimeout(() => {
      setMoving(false)
      setQuestionOpen(true)
    }, MOVE_DELAY_MS)
  }

  const closeQuestionAfterFeedback = (nextStatus: GameStatus) => {
    feedbackTimerRef.current = window.setTimeout(() => {
      setQuestionOpen(false)
      setFeedback(null)
      setFillAnswer('')
      setSelectedOptionIds([])
      setStatus(nextStatus)
    }, FEEDBACK_DELAY_MS)
  }

  const submitAnswer = () => {
    if (!currentQuestion || feedback) return

    const result = currentQuestion.type === 'fill'
      ? evaluateFillAnswer(currentQuestion, fillAnswer)
      : evaluateChoiceAnswer(currentQuestion, selectedOptionIds)

    const correct = result.correct
    if (correct) {
      const nextScore = score + currentQuestion.points
      const nextCompleted = Array.from(new Set([...completedCells, position]))
      setScore(nextScore)
      setCompletedCells(nextCompleted)
      setFeedback('correct')
      closeQuestionAfterFeedback(position === 9 ? 'won' : 'playing')
      return
    }

    const nextHp = hp - 1
    setHp(nextHp)
    setHpBump(true)
    setFeedback('wrong')
    setPosition(pendingMiddleCell)
    window.setTimeout(() => setHpBump(false), 360)
    closeQuestionAfterFeedback(nextHp <= 0 ? 'lost' : 'playing')
  }

  const updateSelectedOptionIds = (optionId: string) => {
    if (!currentQuestion || feedback) return

    if (currentQuestion.type === 'multiple') {
      setSelectedOptionIds((ids) =>
        ids.includes(optionId) ? ids.filter((id) => id !== optionId) : [...ids, optionId],
      )
      return
    }

    setSelectedOptionIds([optionId])
  }

  const hasAnswer = currentQuestion?.type === 'fill'
    ? fillAnswer.trim().length > 0
    : selectedOptionIds.length > 0

  const renderHearts = () => {
    return Array.from({ length: INITIAL_HP }, (_, index) => (
      <span key={index} className={index < hp ? 'nine-grid__heart' : 'nine-grid__heart nine-grid__heart--empty'}>
        ❤️
      </span>
    ))
  }

  return (
    <section className={`nine-grid ${status === 'won' ? 'nine-grid--won' : ''}`}>
      {status === 'won' && <div className="nine-grid__confetti" aria-hidden="true" />}

      <header className="nine-grid__header">
        <div>
          <h1>九宫格数字大冒险</h1>
          <p>每次前进两格，答对守住位置，答错退回中间格。</p>
        </div>
        <div className="nine-grid__stats">
          <div className={`nine-grid__hp ${hpBump ? 'nine-grid__hp--bump' : ''}`}>
            {renderHearts()}
          </div>
          <strong>Score {score}</strong>
        </div>
      </header>

      <main className="nine-grid__stage">
        <div className="nine-grid__board">
          {Array.from({ length: 9 }, (_, index) => {
            const cell = index + 1
            const active = cell === position
            const completed = completedCells.includes(cell)

            return (
              <div
                key={cell}
                className={[
                  'nine-grid__cell',
                  active ? 'nine-grid__cell--active' : '',
                  completed ? 'nine-grid__cell--completed' : '',
                ].join(' ')}
              >
                <span>{cell}</span>
              </div>
            )
          })}
          <div
            className="nine-grid__player"
            style={{
              transform: `translate(${playerPoint.x}%, ${playerPoint.y}%)`,
            }}
          >
            <span>勇者</span>
          </div>
        </div>

        <aside className="nine-grid__panel">
          {status === 'won' ? (
            <div className="nine-grid__result">
              <div className="nine-grid__medal">MATH</div>
              <h2>挑战成功</h2>
              <p>最终得分：{score}</p>
              <Button type="primary" size="large" onClick={resetGame}>
                再玩一次
              </Button>
            </div>
          ) : status === 'lost' ? (
            <div className="nine-grid__result nine-grid__result--lost">
              <h2>游戏结束</h2>
              <p>HP 已归零，当前得分：{score}</p>
              <Button type="primary" size="large" onClick={resetGame}>
                重新开始
              </Button>
            </div>
          ) : (
            <>
              <div className="nine-grid__hint">
                <span>当前位置</span>
                <strong>{position}</strong>
              </div>
              <Button type="primary" size="large" block disabled={!canMove} loading={moving} onClick={startMove}>
                出发
              </Button>
            </>
          )}
        </aside>
      </main>

      <Modal
        centered
        open={questionOpen}
        title="格子挑战题"
        footer={null}
        closable={false}
        maskClosable={false}
        className="nine-grid__modal"
      >
        {currentQuestion && (
          <div className="nine-grid__question">
            <div className="nine-grid__tags">
              <Tag color="blue">{currentQuestion.title}</Tag>
              <Tag color={currentQuestion.difficulty === 'hard' ? 'red' : 'green'}>
                {getDifficultyLabel(currentQuestion)}
              </Tag>
            </div>
            <h2>{currentQuestion.prompt}</h2>
            {currentQuestion.type === 'fill' ? (
              <Input
                autoFocus
                value={fillAnswer}
                disabled={Boolean(feedback)}
                className="nine-grid__answer"
                placeholder={currentQuestion.answerHint ?? '输入答案'}
                onChange={(event) => setFillAnswer(event.target.value)}
                onPressEnter={submitAnswer}
              />
            ) : (
              <div className="nine-grid__options">
                {currentQuestion.options?.map((option) => (
                  <Button
                    key={option.id}
                    block
                    type={selectedOptionIds.includes(option.id) ? 'primary' : 'default'}
                    disabled={Boolean(feedback)}
                    onClick={() => updateSelectedOptionIds(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            {feedback && (
              <div className={`nine-grid__feedback nine-grid__feedback--${feedback}`}>
                {feedback === 'correct' ? '正确' : '遗憾'}
              </div>
            )}
            <Button type="primary" size="large" block disabled={!hasAnswer || Boolean(feedback)} onClick={submitAnswer}>
              提交答案
            </Button>
          </div>
        )}
      </Modal>
    </section>
  )
}
