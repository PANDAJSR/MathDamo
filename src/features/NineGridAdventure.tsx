import { Button, InputNumber, Modal, Tag } from 'antd'
import { useMemo, useRef, useState } from 'react'
import './NineGridAdventure.css'

const GRID_SIZE = 3
const INITIAL_HP = 3
const MOVE_DELAY_MS = 620
const FEEDBACK_DELAY_MS = 900

type GameStatus = 'playing' | 'won' | 'lost'
type Feedback = 'correct' | 'wrong' | null
type Question = {
  prompt: string
  answer: number
  type: string
  difficulty: string
}

const questionBank: Question[] = [
  { prompt: '9 + 8 = ?', answer: 17, type: '加法', difficulty: '简单' },
  { prompt: '25 - 7 = ?', answer: 18, type: '减法', difficulty: '简单' },
  { prompt: '6 x 4 = ?', answer: 24, type: '乘法', difficulty: '中等' },
  { prompt: '36 / 6 = ?', answer: 6, type: '除法', difficulty: '中等' },
  { prompt: '5 的平方是多少？', answer: 25, type: '平方', difficulty: '中等' },
  { prompt: '如果 3x = 21，x = ?', answer: 7, type: '方程', difficulty: '进阶' },
  { prompt: '一个三角形内角和是多少度？', answer: 180, type: '几何', difficulty: '进阶' },
  { prompt: '12 和 18 的最大公因数是？', answer: 6, type: '数论', difficulty: '进阶' },
  { prompt: '2, 4, 8, 16, 下一项是？', answer: 32, type: '规律', difficulty: '挑战' },
]

const createGeneratedQuestion = (cell: number, score: number): Question => {
  const base = cell + score + 2
  const multiplier = (cell % 3) + 2

  if (cell >= 7) {
    return {
      prompt: `${base} x ${multiplier} - ${cell} = ?`,
      answer: base * multiplier - cell,
      type: '混合运算',
      difficulty: '挑战',
    }
  }

  return {
    prompt: `${base} + ${cell * multiplier} = ?`,
    answer: base + cell * multiplier,
    type: '心算',
    difficulty: cell >= 4 ? '中等' : '简单',
  }
}

const getQuestionForCell = (cell: number, score: number) => {
  return questionBank[cell - 1] ?? createGeneratedQuestion(cell, score)
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
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [pendingMiddleCell, setPendingMiddleCell] = useState(1)
  const [answer, setAnswer] = useState<number | null>(null)
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
    setAnswer(null)
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
      setAnswer(null)
      setStatus(nextStatus)
    }, FEEDBACK_DELAY_MS)
  }

  const submitAnswer = () => {
    if (!currentQuestion || answer === null || feedback) return

    const correct = Number(answer) === currentQuestion.answer
    if (correct) {
      const nextScore = score + 10
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
              <Tag color="blue">{currentQuestion.type}</Tag>
              <Tag color={currentQuestion.difficulty === '挑战' ? 'red' : 'green'}>{currentQuestion.difficulty}</Tag>
            </div>
            <h2>{currentQuestion.prompt}</h2>
            <InputNumber
              autoFocus
              value={answer}
              disabled={Boolean(feedback)}
              className="nine-grid__answer"
              placeholder="输入答案"
              onChange={setAnswer}
              onPressEnter={submitAnswer}
            />
            {feedback && (
              <div className={`nine-grid__feedback nine-grid__feedback--${feedback}`}>
                {feedback === 'correct' ? '正确' : '遗憾'}
              </div>
            )}
            <Button type="primary" size="large" block disabled={answer === null || Boolean(feedback)} onClick={submitAnswer}>
              提交答案
            </Button>
          </div>
        )}
      </Modal>
    </section>
  )
}
