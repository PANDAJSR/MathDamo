import { Text } from 'mafs'
import type { CSSProperties } from 'react'
import {
  addVec2,
  angleAt,
  centroid,
  distance,
  midpoint,
  normalize,
  scaleVec2,
  subVec2,
  type Vec2,
} from './geometry'

interface PointLabelsProps {
  points: Vec2[]
  labels: string[]
  color: string
}

interface PolygonAnnotationsProps {
  points: Vec2[]
  color: string
  showSideLengths: boolean
  showAngles: boolean
}

const MAFS_TRANSFORM_STYLE: CSSProperties = {
  transform: 'var(--mafs-view-transform)',
}

const LABEL_TEXT_STYLE = {
  fontWeight: 700,
  paintOrder: 'stroke',
  stroke: 'rgba(0, 0, 0, 0.55)',
  strokeWidth: 0.8,
} as const

const POINT_LABEL_TEXT_STYLE = {
  fontWeight: 800,
  paintOrder: 'stroke',
  stroke: 'rgba(0, 0, 0, 0.65)',
  strokeWidth: 0.9,
} as const

function pointsToString(points: Vec2[]): string {
  return points.map((point) => `${point[0]},${point[1]}`).join(' ')
}

function shortestAngleDelta(from: number, to: number): number {
  const fullTurn = Math.PI * 2
  let delta = to - from
  while (delta > Math.PI) delta -= fullTurn
  while (delta < -Math.PI) delta += fullTurn
  return delta
}

function arcPolyline(
  vertex: Vec2,
  startDir: Vec2,
  endDir: Vec2,
  radius: number,
  segments = 14,
): Vec2[] {
  const startAngle = Math.atan2(startDir[1], startDir[0])
  const endAngle = Math.atan2(endDir[1], endDir[0])
  const delta = shortestAngleDelta(startAngle, endAngle)

  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments
    const theta = startAngle + delta * t
    return [
      vertex[0] + Math.cos(theta) * radius,
      vertex[1] + Math.sin(theta) * radius,
    ]
  })
}

export function PointLabels({ points, labels, color }: PointLabelsProps) {
  return (
    <>
      {labels.map((label, index) => {
        const point = points[index]
        if (!point) return null

        return (
          <Text
            key={`${label}-${index}`}
            x={point[0]}
            y={point[1]}
            size={18}
            color={color}
            attach="ne"
            attachDistance={12}
            svgTextProps={POINT_LABEL_TEXT_STYLE}
          >
            {label}
          </Text>
        )
      })}
    </>
  )
}

export function PolygonAnnotations({
  points,
  color,
  showSideLengths,
  showAngles,
}: PolygonAnnotationsProps) {
  const count = points.length
  const center = centroid(points)

  return (
    <>
      {showSideLengths &&
        points.map((point, index) => {
          const next = points[(index + 1) % count]
          const edgeCenter = midpoint(point, next)
          const len = distance(point, next)
          const edge = subVec2(next, point)
          const normal: Vec2 = normalize([-edge[1], edge[0]])
          const toCenter = subVec2(center, edgeCenter)
          const towardCenter =
            normal[0] * toCenter[0] + normal[1] * toCenter[1] > 0 ? normal : scaleVec2(normal, -1)
          const labelPos = addVec2(edgeCenter, scaleVec2(towardCenter, 0.28))

          return (
            <Text
              key={`len-${index}`}
              x={labelPos[0]}
              y={labelPos[1]}
              size={13}
              color={color}
              svgTextProps={LABEL_TEXT_STYLE}
            >
              {len.toFixed(2)}
            </Text>
          )
        })}

      {showAngles &&
        points.map((curr, index) => {
          const prev = points[(index - 1 + count) % count]
          const next = points[(index + 1) % count]
          const angleDeg = angleAt(prev, curr, next)

          const toPrev = normalize(subVec2(prev, curr))
          const toNext = normalize(subVec2(next, curr))
          const edgeMinLen = Math.min(distance(prev, curr), distance(next, curr))
          const markerRadius = Math.max(0.2, Math.min(0.45, edgeMinLen * 0.22))

          const bisectorRaw = addVec2(toPrev, toNext)
          const fallback = normalize(subVec2(center, curr))
          let inward = normalize(bisectorRaw)
          if (inward[0] === 0 && inward[1] === 0) inward = fallback
          if (inward[0] * fallback[0] + inward[1] * fallback[1] < 0) {
            inward = scaleVec2(inward, -1)
          }

          const labelPos = addVec2(curr, scaleVec2(inward, markerRadius + 0.2))
          const isRightAngle = Math.abs(angleDeg - 90) <= 1.5

          const arcPoints = arcPolyline(curr, toPrev, toNext, markerRadius)
          const squareLen = markerRadius * 0.65
          const rightCorner = addVec2(
            addVec2(curr, scaleVec2(toPrev, squareLen)),
            scaleVec2(toNext, squareLen),
          )
          const rightAnglePoints: Vec2[] = [
            addVec2(curr, scaleVec2(toPrev, squareLen)),
            rightCorner,
            addVec2(curr, scaleVec2(toNext, squareLen)),
          ]

          return (
            <g key={`ang-marker-${index}`}>
              {isRightAngle ? (
                <polyline
                  points={pointsToString(rightAnglePoints)}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.06}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={MAFS_TRANSFORM_STYLE}
                />
              ) : (
                <polyline
                  points={pointsToString(arcPoints)}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.06}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={MAFS_TRANSFORM_STYLE}
                />
              )}

              <Text
                x={labelPos[0]}
                y={labelPos[1]}
                size={13}
                color={color}
                svgTextProps={LABEL_TEXT_STYLE}
              >
                {angleDeg.toFixed(1)}°
              </Text>
            </g>
          )
        })}
    </>
  )
}
