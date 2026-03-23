export type Vec2 = [number, number]

export const initialLeftCenter: Vec2 = [-5, 0]
export const initialRightCenter: Vec2 = [5, 0]

export function createRegularPolygon(vertexCount: number): Vec2[] {
  const radius = 2

  return Array.from({ length: vertexCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / vertexCount - Math.PI / 2
    return [radius * Math.cos(angle), radius * Math.sin(angle)]
  })
}

export function addVec2(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]]
}

export function subVec2(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]]
}

export function scaleVec2(point: Vec2, factor: number): Vec2 {
  return [point[0] * factor, point[1] * factor]
}

export function rotateVec2(point: Vec2, angleRad: number): Vec2 {
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return [point[0] * cos - point[1] * sin, point[0] * sin + point[1] * cos]
}

export function inverseRotateVec2(point: Vec2, angleRad: number): Vec2 {
  return rotateVec2(point, -angleRad)
}

export function toVec2(point: Vec2): Vec2 {
  return [point[0], point[1]]
}

export function toPolygonPoints(points: Vec2[]): string {
  return points.map((point) => `${point[0]},${point[1]}`).join(' ')
}

export function snapToHalfGrid(point: Vec2): Vec2 {
  return [Math.round(point[0] * 2) / 2, Math.round(point[1] * 2) / 2]
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.hypot(dx, dy)
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

export function magnitude(v: Vec2): number {
  return Math.hypot(v[0], v[1])
}

export function normalize(v: Vec2): Vec2 {
  const mag = magnitude(v)
  if (mag === 0) return [0, 0]
  return [v[0] / mag, v[1] / mag]
}

export function centroid(points: Vec2[]): Vec2 {
  const sum = points.reduce<Vec2>(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
    [0, 0],
  )
  return [sum[0] / points.length, sum[1] / points.length]
}

export function angleAt(prev: Vec2, curr: Vec2, next: Vec2): number {
  const v1: Vec2 = [prev[0] - curr[0], prev[1] - curr[1]]
  const v2: Vec2 = [next[0] - curr[0], next[1] - curr[1]]
  const dot = v1[0] * v2[0] + v1[1] * v2[1]
  const mag = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1])
  if (mag === 0) return 0
  const cos = Math.max(-1, Math.min(1, dot / mag))
  return (Math.acos(cos) * 180) / Math.PI
}

export function formatRatio(a: number, b: number): string {
  return `${a.toFixed(2)}:${b.toFixed(2)}`
}

export function normalizeRatio(a: number, b: number): string {
  if (a === 0 && b === 0) return '0:0'
  if (a === 0) return '0:1'
  const second = b / a
  return `1:${second.toFixed(2)}`
}
