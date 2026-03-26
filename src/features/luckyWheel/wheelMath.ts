export type WheelItem = {
  id: number
  label: string
  color: string
  weight: number
}

export type WheelSegment = {
  start: number
  end: number
  center: number
  span: number
}

export type LabelLayout = {
  x: number
  y: number
  width: number
}

const MIN_WEIGHT = 0.1
const MIN_LABEL_RADIUS_PERCENT = 18
const MAX_LABEL_RADIUS_PERCENT = 46
const MAX_RADIUS_BOOST_PERCENT = 10
const LABEL_DYNAMIC_SPAN_CAP = 120

export function clampWeight(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return MIN_WEIGHT
  return Math.max(MIN_WEIGHT, value)
}

export function pickWeightedIndex(items: WheelItem[]) {
  const totalWeight = items.reduce((sum, item) => sum + clampWeight(item.weight), 0)
  if (totalWeight <= 0) return 0

  const randomPoint = Math.random() * totalWeight
  let cumulative = 0

  for (let index = 0; index < items.length; index += 1) {
    cumulative += clampWeight(items[index].weight)
    if (randomPoint <= cumulative) return index
  }

  return items.length - 1
}

export function buildWheelSegments(items: WheelItem[]): WheelSegment[] {
  if (items.length === 0) return []

  const totalWeight = items.reduce((sum, item) => sum + clampWeight(item.weight), 0)
  if (totalWeight <= 0) {
    const evenSpan = 360 / items.length
    return items.map((_, index) => {
      const start = index * evenSpan
      const end = (index + 1) * evenSpan
      return { start, end, center: start + evenSpan / 2, span: evenSpan }
    })
  }

  let cursor = 0
  return items.map((item, index) => {
    const isLast = index === items.length - 1
    const start = cursor
    const span = isLast ? 360 - cursor : (clampWeight(item.weight) / totalWeight) * 360
    const end = start + span
    cursor = end
    return { start, end, center: start + span / 2, span }
  })
}

export function normalizeDegree(value: number) {
  return ((value % 360) + 360) % 360
}

export function getLabelLayout(segment: WheelSegment, baseRadiusPercent: number): LabelLayout {
  const spanForBoost = Math.min(segment.span, LABEL_DYNAMIC_SPAN_CAP)
  const radiusBoost =
    ((LABEL_DYNAMIC_SPAN_CAP - spanForBoost) / LABEL_DYNAMIC_SPAN_CAP) * MAX_RADIUS_BOOST_PERCENT
  const radius = Math.max(
    MIN_LABEL_RADIUS_PERCENT,
    Math.min(MAX_LABEL_RADIUS_PERCENT, baseRadiusPercent + radiusBoost),
  )
  const angleRad = ((segment.center - 90) * Math.PI) / 180
  const x = 50 + Math.cos(angleRad) * radius
  const y = 50 + Math.sin(angleRad) * radius

  const arcLengthPercent = (2 * Math.PI * radius * segment.span) / 360
  const width = Math.max(7, Math.min(30, arcLengthPercent * 0.86))

  return { x, y, width }
}

export function pickAngleInsideSegment(
  segment: WheelSegment,
  edgePaddingRatio: number,
  edgePaddingMaxDeg: number,
) {
  const maxPaddingBySpan = segment.span * 0.35
  const edgePadding = Math.min(
    edgePaddingMaxDeg,
    maxPaddingBySpan,
    segment.span * edgePaddingRatio,
  )
  const minAngle = segment.start + edgePadding
  const maxAngle = segment.end - edgePadding
  if (maxAngle <= minAngle) return segment.center
  return minAngle + Math.random() * (maxAngle - minAngle)
}
