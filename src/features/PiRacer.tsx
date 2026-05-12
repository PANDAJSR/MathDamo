import { Button } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import './PiRacer.css'

const PI_VALUE = 3.14
const LANE_COUNT = 3
const LANE_TOPS = [20, 50, 80]
const INITIAL_LIVES = 3
const START_X = 106
const COLLISION_X = 16
const FLASH_DURATION_MS = 220
const NEXT_WAVE_DELAY_MS = 420
const SWIPE_THRESHOLD_PX = 36
const WHEEL_THRESHOLD_PX = 28

type Ring = {
  circumference: number
}

type Wave = {
  diameter: number
  targetCircumference: number
  rings: Ring[]
}

type GameMode = 'ready' | 'running' | 'paused' | 'game-over'
type FlashTone = 'success' | 'danger' | null

const roundOne = (value: number) => Math.round(value * 10) / 10

const shuffle = <T,>(items: T[]) => {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

const createWave = (score: number): Wave => {
  const levelBias = Math.min(8, Math.floor(score / 80))
  const diameter = roundOne(12 + Math.random() * 22 + levelBias * 0.8)
  const targetCircumference = roundOne(diameter * PI_VALUE)
  const offsets = shuffle([-0.24, -0.15, 0.16, 0.26]).slice(0, 2)
  const rings = shuffle([
    { circumference: targetCircumference },
    ...offsets.map((offset) => ({
      circumference: roundOne(targetCircumference * (1 + offset)),
    })),
  ])

  return { diameter, targetCircumference, rings }
}

const getLevel = (score: number) => Math.floor(score / 50) + 1

const getSpeed = (level: number) => Math.min(46, 17 + level * 3.6)

export function PiRacer() {
  const [mode, setMode] = useState<GameMode>('ready')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(INITIAL_LIVES)
  const [playerLane, setPlayerLane] = useState(1)
  const [ringX, setRingX] = useState(START_X)
  const [wave, setWave] = useState<Wave>(() => createWave(0))
  const [flashTone, setFlashTone] = useState<FlashTone>(null)
  const [message, setMessage] = useState('选择正确轨道，穿过匹配圆环')

  const scoreRef = useRef(score)
  const livesRef = useRef(lives)
  const playerLaneRef = useRef(playerLane)
  const levelRef = useRef(getLevel(score))
  const waveRef = useRef(wave)
  const ringXRef = useRef(ringX)
  const advancingRef = useRef(false)
  const pointerStartYRef = useRef<number | null>(null)
  const wheelDeltaRef = useRef(0)
  const nextWaveTimerRef = useRef<number | null>(null)
  const flashTimerRef = useRef<number | null>(null)

  const level = getLevel(score)
  const visualDiameter = useMemo(
    () => Math.max(42, Math.min(72, 34 + wave.diameter * 1.2)),
    [wave.diameter],
  )
  const activeLaneTop = LANE_TOPS[playerLane]

  useEffect(() => {
    scoreRef.current = score
    levelRef.current = getLevel(score)
  }, [score])

  useEffect(() => {
    livesRef.current = lives
  }, [lives])

  useEffect(() => {
    playerLaneRef.current = playerLane
  }, [playerLane])

  useEffect(() => {
    waveRef.current = wave
  }, [wave])

  useEffect(() => {
    ringXRef.current = ringX
  }, [ringX])

  useEffect(() => {
    return () => {
      if (nextWaveTimerRef.current) window.clearTimeout(nextWaveTimerRef.current)
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
    }
  }, [])

  const setFlash = useCallback((tone: Exclude<FlashTone, null>) => {
    setFlashTone(tone)

    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
    flashTimerRef.current = window.setTimeout(() => {
      setFlashTone(null)
    }, FLASH_DURATION_MS)
  }, [])

  const moveLane = useCallback((direction: -1 | 1, steps = 1) => {
    setPlayerLane((lane) => Math.max(0, Math.min(LANE_COUNT - 1, lane + direction * steps)))
  }, [])

  const launchWave = useCallback((nextScore: number) => {
    const nextWave = createWave(nextScore)
    waveRef.current = nextWave
    ringXRef.current = START_X
    setWave(nextWave)
    setRingX(START_X)
    advancingRef.current = false
  }, [])

  const restart = useCallback(() => {
    if (nextWaveTimerRef.current) window.clearTimeout(nextWaveTimerRef.current)
    const nextWave = createWave(0)

    scoreRef.current = 0
    livesRef.current = INITIAL_LIVES
    levelRef.current = 1
    waveRef.current = nextWave
    ringXRef.current = START_X
    advancingRef.current = false

    setScore(0)
    setLives(INITIAL_LIVES)
    setPlayerLane(1)
    setRingX(START_X)
    setWave(nextWave)
    setMessage('选择正确轨道，穿过匹配圆环')
    setFlashTone(null)
    setMode('running')
  }, [])

  const resolveCollision = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true

    const currentWave = waveRef.current
    const collidedRing = currentWave.rings[playerLaneRef.current]
    const expectedCircumference = roundOne(currentWave.diameter * PI_VALUE)
    const errorRatio = Math.abs(expectedCircumference - collidedRing.circumference) / collidedRing.circumference
    const matched = errorRatio < 0.05

    if (matched) {
      const nextScore = scoreRef.current + 10
      scoreRef.current = nextScore
      setScore(nextScore)
      setMessage(`命中：${currentWave.diameter.toFixed(1)} x 3.14 ≈ ${expectedCircumference.toFixed(1)}`)
      setFlash('success')
      nextWaveTimerRef.current = window.setTimeout(() => launchWave(nextScore), NEXT_WAVE_DELAY_MS)
      return
    }

    const nextLives = livesRef.current - 1
    livesRef.current = nextLives
    setLives(nextLives)
    setMessage(`偏差 ${(errorRatio * 100).toFixed(1)}%，需要小于 5%`)
    setFlash('danger')

    if (nextLives <= 0) {
      setMode('game-over')
      advancingRef.current = false
      return
    }

    nextWaveTimerRef.current = window.setTimeout(
      () => launchWave(scoreRef.current),
      NEXT_WAVE_DELAY_MS,
    )
  }, [launchWave, setFlash])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault()
        moveLane(-1)
      }

      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault()
        moveLane(1)
      }

      if (event.key === ' ' && mode !== 'game-over') {
        event.preventDefault()
        setMode((currentMode) => (currentMode === 'running' ? 'paused' : 'running'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, moveLane])

  useEffect(() => {
    if (mode !== 'running') return undefined

    let frameId = 0
    let lastTime = performance.now()

    const tick = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (!advancingRef.current) {
        const nextX = ringXRef.current - getSpeed(levelRef.current) * deltaSeconds
        ringXRef.current = nextX
        setRingX(nextX)

        if (nextX <= COLLISION_X) {
          ringXRef.current = COLLISION_X
          setRingX(COLLISION_X)
          resolveCollision()
        }
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [mode, resolveCollision])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartYRef.current === null) return

    const deltaY = event.clientY - pointerStartYRef.current
    const steps = Math.trunc(Math.abs(deltaY) / SWIPE_THRESHOLD_PX)
    if (steps === 0) return

    const direction = deltaY > 0 ? 1 : -1
    moveLane(direction, steps)
    pointerStartYRef.current += direction * SWIPE_THRESHOLD_PX * steps
  }

  const handlePointerEnd = () => {
    pointerStartYRef.current = null
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    wheelDeltaRef.current += event.deltaY

    const steps = Math.trunc(Math.abs(wheelDeltaRef.current) / WHEEL_THRESHOLD_PX)
    if (steps === 0) return

    const direction = wheelDeltaRef.current > 0 ? 1 : -1
    moveLane(direction, steps)
    wheelDeltaRef.current -= direction * WHEEL_THRESHOLD_PX * steps
  }

  return (
    <section className={`pi-racer ${flashTone ? `pi-racer--${flashTone}` : ''}`}>
      <div className="pi-racer__hud">
        <div className="pi-racer__target">目标周长 C = {wave.targetCircumference.toFixed(1)}</div>
        <div className="pi-racer__stats" aria-label="游戏状态">
          <span>得分 {score}</span>
          <span>生命值 {Math.max(0, lives)}</span>
          <span>当前关卡 {level}</span>
        </div>
      </div>

      <div
        className="pi-racer__arena"
        aria-label="极速圆周率游戏区域"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
      >
        <div className="pi-racer__grid" />
        {LANE_TOPS.map((top, index) => (
          <div
            className={`pi-racer__lane ${playerLane === index ? 'pi-racer__lane--active' : ''}`}
            key={top}
            style={{ top: `${top}%` }}
          />
        ))}

        <div
          className="pi-racer__player"
          style={{
            top: `${activeLaneTop}%`,
            width: visualDiameter,
            height: visualDiameter,
          }}
        >
          <span>d = {wave.diameter.toFixed(1)}</span>
        </div>

        {wave.rings.map((ring, index) => (
          <div
            className="pi-racer__ring"
            key={`${ring.circumference}-${index}`}
            style={{ left: `${ringX}%`, top: `${LANE_TOPS[index]}%` }}
          >
            <span>C = {ring.circumference.toFixed(1)}</span>
          </div>
        ))}

        <div className="pi-racer__status">
          <strong>{mode === 'game-over' ? '游戏结束' : message}</strong>
          <span>W/S、↑/↓、滑动或滚轮移动，空格暂停</span>
        </div>

        {mode !== 'running' && (
          <div className="pi-racer__overlay">
            <div>
              <h1>极速圆周率</h1>
              <p>用 C = d x 3.14 选择正确圆环</p>
              <Button type="primary" size="large" onClick={mode === 'game-over' ? restart : () => setMode('running')}>
                {mode === 'game-over' ? '重新开始' : '开始游戏'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="pi-racer__controls" aria-label="移动控制">
        <Button onClick={() => moveLane(-1)}>上移</Button>
        <Button onClick={() => setMode((currentMode) => (currentMode === 'running' ? 'paused' : 'running'))}>
          {mode === 'running' ? '暂停' : '继续'}
        </Button>
        <Button onClick={() => moveLane(1)}>下移</Button>
        <Button onClick={restart}>重开</Button>
      </div>
    </section>
  )
}
