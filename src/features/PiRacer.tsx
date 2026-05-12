import { Button } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import './PiRacer.css'
import { createWave, getFormulaText, getLevel, getSpeed, type Wave } from './piRacer/game'

const LANE_COUNT = 3
const LANE_TOPS = [20, 50, 80]
const INITIAL_LIVES = 3
const START_X = 106
const COLLISION_X = 16
const FLASH_DURATION_MS = 220
const NEXT_WAVE_DELAY_MS = 420
const SWIPE_THRESHOLD_PX = 36
const WHEEL_THRESHOLD_PX = 28
const INTERACTIVE_SELECTOR = 'button, input, select, textarea, a, [role="button"], .ant-btn'

type GameMode = 'ready' | 'running' | 'paused' | 'game-over'
type FlashTone = 'success' | 'danger' | null

export function PiRacer() {
  const [mode, setMode] = useState<GameMode>('ready')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(INITIAL_LIVES)
  const [playerLane, setPlayerLane] = useState(1)
  const [ringX, setRingX] = useState(START_X)
  const [wave, setWave] = useState<Wave>(() => createWave(0))
  const [flashTone, setFlashTone] = useState<FlashTone>(null)
  const [message, setMessage] = useState('根据已知量计算周长，穿过匹配圆环')

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
    setMessage('根据已知量计算周长，穿过匹配圆环')
    setFlashTone(null)
    setMode('running')
  }, [])

  const resolveCollision = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true

    const currentWave = waveRef.current
    const collidedRing = currentWave.rings[playerLaneRef.current]
    const expectedCircumference = currentWave.targetCircumference
    const errorRatio = Math.abs(expectedCircumference - collidedRing.circumference) / collidedRing.circumference
    const matched = errorRatio < 0.05

    if (matched) {
      const nextScore = scoreRef.current + 10
      scoreRef.current = nextScore
      setScore(nextScore)
      setMessage(`命中：${getFormulaText(currentWave.clue)} ≈ ${expectedCircumference.toFixed(1)}`)
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
    if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) {
      pointerStartYRef.current = null
      return
    }

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

  const overlayTitle = mode === 'game-over' ? '游戏结束' : '极速圆周率'
  const overlayDescription = mode === 'game-over'
    ? `最终得分 ${score}，到达第 ${level} 关`
    : '根据直径、半径或面积推算周长 C'

  return (
    <section className={`pi-racer ${flashTone ? `pi-racer--${flashTone}` : ''}`}>
      <div className="pi-racer__hud">
        <div className="pi-racer__target">
          <span>目标周长 C = ?</span>
          <small>已知{wave.clue.name} {wave.clue.symbol} = {wave.clue.value.toFixed(1)}</small>
        </div>
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
          <span>
            <b>{wave.clue.symbol}</b>
            <small>= {wave.clue.value.toFixed(1)}</small>
          </span>
        </div>

        {wave.rings.map((ring, index) => (
          <div
            className="pi-racer__ring"
            key={`${ring.clue.symbol}-${ring.clue.value}-${index}`}
            style={{ left: `${ringX}%`, top: `${LANE_TOPS[index]}%` }}
          >
            <span>{ring.clue.symbol} = {ring.clue.value.toFixed(1)}</span>
          </div>
        ))}

        <div className="pi-racer__status">
          <strong>{mode === 'game-over' ? '游戏结束' : message}</strong>
          <span>W/S、↑/↓、滑动或滚轮移动，空格暂停</span>
        </div>

        {mode !== 'running' && (
          <div className={`pi-racer__overlay ${mode === 'game-over' ? 'pi-racer__overlay--game-over' : ''}`}>
            <div>
              <h1>{overlayTitle}</h1>
              <p>{overlayDescription}</p>
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
