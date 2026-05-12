export const WIDTH = 1000
export const HEIGHT = 620
export const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 }
export const START_LIVES = 5
export const HIT_RADIUS = 46
export const CORE_RADIUS = 58
export const ULTIMATE_DURATION_MS = 7600

export type GameMode = 'ready' | 'running' | 'paused' | 'game-over'
export type MonsterKind = 'mirror' | 'rotate'
export type MonsterShape = 'semicircle' | 'triangle' | 'bracket' | 'diamond'

export type Point = {
  x: number
  y: number
}

export type Monster = Point & {
  id: number
  kind: MonsterKind
  shape: MonsterShape
  speed: number
  size: number
}

export type Axis = {
  angle: number
  label: string
}

export const normalAxes: Axis[] = [
  { angle: 90, label: '竖直对称轴' },
  { angle: 0, label: '水平对称轴' },
  { angle: 45, label: '45° 对称轴' },
  { angle: 135, label: '135° 对称轴' },
]

const shapes: MonsterShape[] = ['semicircle', 'triangle', 'bracket', 'diamond']

export const getDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export const rotateHalfTurn = (point: Point) => ({
  x: CENTER.x * 2 - point.x,
  y: CENTER.y * 2 - point.y,
})

export const reflectAcrossAxis = (point: Point, axis: Axis) => {
  const angle = (axis.angle * Math.PI) / 180
  const dx = point.x - CENTER.x
  const dy = point.y - CENTER.y
  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  const projection = dx * ux + dy * uy
  return {
    x: CENTER.x + 2 * projection * ux - dx,
    y: CENTER.y + 2 * projection * uy - dy,
  }
}

export const getCompletionPoint = (monster: Monster, axis: Axis) => (
  monster.kind === 'rotate' ? rotateHalfTurn(monster) : reflectAcrossAxis(monster, axis)
)

export const createMonster = (id: number, score: number): Monster => {
  const edge = Math.floor(Math.random() * 4)
  const offset = Math.random()
  const startPoints = [
    { x: 70, y: 80 + offset * (HEIGHT - 160) },
    { x: WIDTH - 70, y: 80 + offset * (HEIGHT - 160) },
    { x: 100 + offset * (WIDTH - 200), y: 70 },
    { x: 100 + offset * (WIDTH - 200), y: HEIGHT - 70 },
  ]
  const start = startPoints[edge]

  return {
    ...start,
    id,
    kind: Math.random() > 0.34 ? 'mirror' : 'rotate',
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    speed: 36 + Math.min(62, score * 1.4) + Math.random() * 16,
    size: 34 + Math.random() * 10,
  }
}

export const createOpeningWave = (startId: number, count: number) => (
  Array.from({ length: count }, (_, index) => createMonster(startId + index, 0))
)

export const axisLine = (axis: Axis) => {
  const angle = (axis.angle * Math.PI) / 180
  const dx = Math.cos(angle) * 700
  const dy = Math.sin(angle) * 700
  return {
    x1: CENTER.x - dx,
    y1: CENTER.y - dy,
    x2: CENTER.x + dx,
    y2: CENTER.y + dy,
  }
}

export const monsterRotation = (monster: Monster) => (
  Math.atan2(CENTER.y - monster.y, CENTER.x - monster.x) * 180 / Math.PI
)
