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
  { prompt: '48 的 5/6 是多少？', answer: 40, type: '分数乘法', difficulty: '六年级' },
  { prompt: '一个数的 40% 是 18，这个数是多少？', answer: 45, type: '百分数', difficulty: '六年级' },
  { prompt: '甲乙人数比是 3:5，一共 96 人，乙有多少人？', answer: 60, type: '比', difficulty: '六年级' },
  { prompt: '一件商品打八折后卖 96 元，原价是多少元？', answer: 120, type: '百分数应用', difficulty: '六年级' },
  { prompt: '圆的半径是 6 cm，面积是多少？π 取 3.14', answer: 113.04, type: '圆面积', difficulty: '六年级' },
  { prompt: '如果 x/12 = 5/8，那么 x 是多少？', answer: 7.5, type: '比例', difficulty: '六年级' },
  { prompt: '一个长方体长 8、宽 5、高 3，体积是多少？', answer: 120, type: '立体几何', difficulty: '六年级' },
  { prompt: '7.2 除以 0.18 等于多少？', answer: 40, type: '小数除法', difficulty: '六年级' },
  { prompt: '一段路已经走了 2/5，还剩 72 米，全长多少米？', answer: 120, type: '分数应用', difficulty: '挑战' },
]

const createGeneratedQuestion = (cell: number, score: number): Question => {
  const base = cell + score / 10 + 8
  const multiplier = (cell % 4) + 3

  if (cell >= 7) {
    return {
      prompt: `一个数的 ${multiplier * 10}% 是 ${base * multiplier}，这个数是多少？`,
      answer: base * 10,
      type: '百分数应用',
      difficulty: '挑战',
    }
  }

  return {
    prompt: `${base * multiplier} 按 ${multiplier}:2 分成两部分，较大的部分是多少？`,
    answer: base * multiplier * (multiplier / (multiplier + 2)),
    type: '比的应用',
    difficulty: '六年级',
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

const isAnswerCorrect = (value: number, expected: number) => {
  return Math.abs(value - expected) < 0.001
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

    const correct = isAnswerCorrect(Number(answer), currentQuestion.answer)
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
