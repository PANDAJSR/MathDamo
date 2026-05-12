import { Button } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import './SymmetryGuardians.css'
import {
  CENTER,
  CORE_RADIUS,
  HEIGHT,
  HIT_RADIUS,
  START_LIVES,
  ULTIMATE_DURATION_MS,
  WIDTH,
  axisLine,
  createMonster,
  getCompletionPoint,
  getDistance,
  monsterRotation,
  normalAxes,
  type Axis,
  type GameMode,
  type Monster,
  type Point,
} from './symmetryGuardians/game'

function MonsterGlyph({ monster }: { monster: Monster }) {
  const size = monster.size
  const color = monster.kind === 'rotate' ? '#ffb454' : '#44d7c5'

  return (
    <g transform={`translate(${monster.x} ${monster.y}) rotate(${monsterRotation(monster)})`}>
      <circle r={size + 8} fill="rgba(255,255,255,0.04)" stroke={color} strokeDasharray="5 8" />
      {monster.shape === 'semicircle' && (
        <path d={`M 0 ${-size} A ${size} ${size} 0 0 1 0 ${size} L 0 0 Z`} fill={color} />
      )}
      {monster.shape === 'triangle' && (
        <path d={`M ${-size * 0.6} ${-size} L ${size} 0 L ${-size * 0.6} ${size} Z`} fill={color} />
      )}
      {monster.shape === 'bracket' && (
        <path
          d={`M ${-size * 0.7} ${-size} H ${size * 0.45} V ${-size * 0.45} H ${-size * 0.1} V ${size * 0.45} H ${size * 0.45} V ${size} H ${-size * 0.7} Z`}
          fill={color}
        />
      )}
      {monster.shape === 'diamond' && (
        <path d={`M 0 ${-size} L ${size} 0 L 0 ${size} Z`} fill={color} />
      )}
      <text y={size + 28} textAnchor="middle">{monster.kind === 'rotate' ? '180°' : '镜像'}</text>
    </g>
  )
}

export function SymmetryGuardians() {
  const [mode, setMode] = useState<GameMode>('ready')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(START_LIVES)
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [axis, setAxis] = useState(normalAxes[0])
  const [ultimateAxis, setUltimateAxis] = useState<Axis | null>(null)
  const [charge, setCharge] = useState(0)
  const [message, setMessage] = useState('点击镜像点或 180° 旋转点，补全怪兽')
  const [strokes, setStrokes] = useState<Point[]>([])

  const svgRef = useRef<SVGSVGElement | null>(null)
  const modeRef = useRef(mode)
  const scoreRef = useRef(score)
  const livesRef = useRef(lives)
  const monsterIdRef = useRef(1)
  const spawnElapsedRef = useRef(0)
  const isDrawingRef = useRef(false)
  const ultimateTimerRef = useRef<number | null>(null)

  const activeAxis = ultimateAxis ?? axis
  const activeAxisLine = useMemo(() => axisLine(activeAxis), [activeAxis])
  const level = Math.floor(score / 50) + 1

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    livesRef.current = lives
  }, [lives])

  useEffect(() => () => {
    if (ultimateTimerRef.current) window.clearTimeout(ultimateTimerRef.current)
  }, [])

  const clientToPoint = (event: PointerEvent<SVGSVGElement>): Point | null => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return null

    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    }
  }

  const clearMonsterAt = useCallback((point: Point) => {
    const cleared = monsters.find((monster) => (
      getDistance(point, getCompletionPoint(monster, activeAxis)) <= HIT_RADIUS
    ))

    if (!cleared) return
    setMonsters((current) => current.filter((monster) => monster.id !== cleared.id))

    const addScore = cleared.kind === 'rotate' ? 15 : 10
    const nextScore = scoreRef.current + addScore
    scoreRef.current = nextScore
    setScore(nextScore)
    setCharge((current) => Math.min(100, current + 18))
    setMessage(cleared.kind === 'rotate' ? '旋转补全成功' : '轴对称补全成功')

    if (nextScore > 0 && nextScore % 40 === 0 && !ultimateAxis) {
      setAxis(normalAxes[(normalAxes.findIndex((item) => item.angle === axis.angle) + 1) % normalAxes.length])
    }
  }, [activeAxis, axis.angle, monsters, ultimateAxis])

  const restart = useCallback(() => {
    if (ultimateTimerRef.current) window.clearTimeout(ultimateTimerRef.current)
    scoreRef.current = 0
    livesRef.current = START_LIVES
    monsterIdRef.current = 1
    spawnElapsedRef.current = 0
    setScore(0)
    setLives(START_LIVES)
    setMonsters([])
    setAxis(normalAxes[0])
    setUltimateAxis(null)
    setCharge(0)
    setStrokes([])
    setMessage('点击镜像点或 180° 旋转点，补全怪兽')
    setMode('running')
  }, [])

  const triggerUltimate = useCallback(() => {
    if (charge < 100 || mode !== 'running') return

    const randomAxis = {
      angle: 15 + Math.round(Math.random() * 150),
      label: '随机倾斜对称轴',
    }
    setCharge(0)
    setUltimateAxis(randomAxis)
    setStrokes([])
    setMessage('沿着所有镜像点拖动，大招期间按随机轴补全')

    if (ultimateTimerRef.current) window.clearTimeout(ultimateTimerRef.current)
    ultimateTimerRef.current = window.setTimeout(() => {
      setUltimateAxis(null)
      setStrokes([])
      setMessage('大招结束，继续补全来袭图形')
    }, ULTIMATE_DURATION_MS)
  }, [charge, mode])

  useEffect(() => {
    if (mode !== 'running') return undefined

    let frameId = 0
    let lastTime = performance.now()

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now
      spawnElapsedRef.current += delta

      setMonsters((current) => {
        let damage = 0
        const moved = current
          .map((monster) => {
            const angleToCore = Math.atan2(CENTER.y - monster.y, CENTER.x - monster.x)
            return {
              ...monster,
              x: monster.x + Math.cos(angleToCore) * monster.speed * delta,
              y: monster.y + Math.sin(angleToCore) * monster.speed * delta,
            }
          })
          .filter((monster) => {
            const reachedCore = getDistance(monster, CENTER) <= CORE_RADIUS
            if (reachedCore) damage += 1
            return !reachedCore
          })

        if (damage > 0) {
          setLives((currentLives) => {
            const nextLives = Math.max(0, currentLives - damage)
            livesRef.current = nextLives
            if (nextLives <= 0) setMode('game-over')
            return nextLives
          })
          setMessage('核心受击，补全位置要更快')
        }

        const spawnInterval = Math.max(0.82, 1.75 - scoreRef.current * 0.012)
        if (spawnElapsedRef.current >= spawnInterval && moved.length < 9) {
          spawnElapsedRef.current = 0
          return [...moved, createMonster(monsterIdRef.current++, scoreRef.current)]
        }

        return moved
      })

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [mode])

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (mode !== 'running') return
    const point = clientToPoint(event)
    if (!point) return

    isDrawingRef.current = Boolean(ultimateAxis)
    setStrokes(ultimateAxis ? [point] : [])
    clearMonsterAt(point)
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (mode !== 'running' || !isDrawingRef.current) return
    const point = clientToPoint(event)
    if (!point) return

    setStrokes((current) => [...current.slice(-28), point])
    clearMonsterAt(point)
  }

  const handlePointerEnd = () => {
    isDrawingRef.current = false
  }

  const overlayTitle = mode === 'game-over' ? '核心失守' : '对称守卫者'
  const overlayText = mode === 'game-over'
    ? `得分 ${score}，守到第 ${level} 波`
    : '用轴对称和 180° 旋转补全几何怪兽'

  return (
    <section className={`symmetry-guardians ${ultimateAxis ? 'symmetry-guardians--ultimate' : ''}`}>
      <div className="symmetry-guardians__hud">
        <div>
          <h1>对称守卫者：几何镜像打击</h1>
          <p>{message}</p>
        </div>
        <div className="symmetry-guardians__stats" aria-label="游戏状态">
          <span>得分 {score}</span>
          <span>生命 {lives}</span>
          <span>波次 {level}</span>
          <span>{activeAxis.label}</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="symmetry-guardians__arena"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="对称守卫者游戏区域"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <defs>
          <radialGradient id="guardian-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#83f7d1" />
            <stop offset="100%" stopColor="#147b88" />
          </radialGradient>
        </defs>

        <rect width={WIDTH} height={HEIGHT} rx="18" />
        <line className="symmetry-guardians__axis" {...activeAxisLine} />
        <circle className="symmetry-guardians__core-ring" cx={CENTER.x} cy={CENTER.y} r="90" />
        <circle className="symmetry-guardians__core" cx={CENTER.x} cy={CENTER.y} r={CORE_RADIUS} />
        <text className="symmetry-guardians__core-label" x={CENTER.x} y={CENTER.y + 7} textAnchor="middle">核心</text>

        {monsters.map((monster) => {
          const point = getCompletionPoint(monster, activeAxis)
          return (
            <g key={monster.id}>
              <circle className="symmetry-guardians__target" cx={point.x} cy={point.y} r={HIT_RADIUS} />
              <MonsterGlyph monster={monster} />
            </g>
          )
        })}

        {strokes.length > 1 && (
          <polyline
            className="symmetry-guardians__stroke"
            points={strokes.map((point) => `${point.x},${point.y}`).join(' ')}
          />
        )}
      </svg>

      {mode !== 'running' && (
        <div className="symmetry-guardians__overlay">
          <h2>{overlayTitle}</h2>
          <p>{overlayText}</p>
          <Button type="primary" size="large" onClick={restart}>
            {mode === 'game-over' ? '重新开始' : '开始守卫'}
          </Button>
        </div>
      )}

      <div className="symmetry-guardians__controls">
        <Button onClick={() => setMode((current) => (current === 'running' ? 'paused' : 'running'))}>
          {mode === 'running' ? '暂停' : '继续'}
        </Button>
        <Button onClick={triggerUltimate} disabled={charge < 100 || mode !== 'running'}>
          镜像大招 {charge}%
        </Button>
        <Button onClick={restart}>重开</Button>
      </div>
    </section>
  )
}
