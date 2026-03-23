import { Slider, Switch, Typography } from 'antd'
import { Coordinates, Mafs, MovablePoint, Polygon, Text, useMovable } from 'mafs'
import { useMemo, useRef, useState, type RefObject } from 'react'
import 'mafs/core.css'
import './ShapeScaleDemo.css'

type Vec2 = [number, number]

const initialLeftCenter: Vec2 = [-5, 0]
const initialRightCenter: Vec2 = [5, 0]

function createRegularPolygon(vertexCount: number): Vec2[] {
  const radius = 2

  return Array.from({ length: vertexCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / vertexCount - Math.PI / 2
    return [radius * Math.cos(angle), radius * Math.sin(angle)]
  })
}

function addVec2(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]]
}

function subVec2(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]]
}

function scaleVec2(point: Vec2, factor: number): Vec2 {
  return [point[0] * factor, point[1] * factor]
}

function rotateVec2(point: Vec2, angleRad: number): Vec2 {
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return [point[0] * cos - point[1] * sin, point[0] * sin + point[1] * cos]
}

function inverseRotateVec2(point: Vec2, angleRad: number): Vec2 {
  return rotateVec2(point, -angleRad)
}

function toVec2(point: Vec2): Vec2 {
  return [point[0], point[1]]
}

function toPolygonPoints(points: Vec2[]): string {
  return points.map((point) => `${point[0]},${point[1]}`).join(' ')
}

function distance(a: Vec2, b: Vec2): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.hypot(dx, dy)
}

function midpoint(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

function magnitude(v: Vec2): number {
  return Math.hypot(v[0], v[1])
}

function normalize(v: Vec2): Vec2 {
  const mag = magnitude(v)
  if (mag === 0) return [0, 0]
  return [v[0] / mag, v[1] / mag]
}

function centroid(points: Vec2[]): Vec2 {
  const sum = points.reduce<Vec2>(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]],
    [0, 0],
  )
  return [sum[0] / points.length, sum[1] / points.length]
}

function angleAt(prev: Vec2, curr: Vec2, next: Vec2): number {
  const v1: Vec2 = [prev[0] - curr[0], prev[1] - curr[1]]
  const v2: Vec2 = [next[0] - curr[0], next[1] - curr[1]]
  const dot = v1[0] * v2[0] + v1[1] * v2[1]
  const mag = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1])
  if (mag === 0) return 0
  const cos = Math.max(-1, Math.min(1, dot / mag))
  return (Math.acos(cos) * 180) / Math.PI
}

interface PolygonAnnotationsProps {
  points: Vec2[]
  color: string
  showSideLengths: boolean
  showAngles: boolean
}

function PolygonAnnotations({
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
          const outward = normal[0] * toCenter[0] + normal[1] * toCenter[1] > 0
          const direction = outward ? scaleVec2(normal, -1) : normal
          const labelPos = addVec2(edgeCenter, scaleVec2(direction, 0.28))
          return (
            <Text
              key={`len-${index}`}
              x={labelPos[0]}
              y={labelPos[1]}
              size={12}
              color={color}
              svgTextProps={{ fontWeight: 500 }}
            >
              {len.toFixed(2)}
            </Text>
          )
        })}
      {showAngles &&
        points.map((curr, index) => {
          const prev = points[(index - 1 + count) % count]
          const next = points[(index + 1) % count]
          const a = angleAt(prev, curr, next)
          const outward = normalize(subVec2(curr, center))
          const labelPos = addVec2(curr, scaleVec2(outward, 0.35))
          return (
            <Text
              key={`ang-${index}`}
              x={labelPos[0]}
              y={labelPos[1]}
              size={12}
              color={color}
              svgTextProps={{ fontWeight: 500 }}
            >
              {a.toFixed(1)}°
            </Text>
          )
        })}
    </>
  )
}

interface DraggablePolygonProps {
  points: Vec2[]
  color: string
  fillOpacity: number
  anchor: Vec2
  onMove: (point: Vec2) => void
}

function DraggablePolygon({
  points,
  color,
  fillOpacity,
  anchor,
  onMove,
}: DraggablePolygonProps) {
  const gestureRef = useRef<SVGPolygonElement>(null)
  const { dragging } = useMovable({
    gestureTarget: gestureRef as unknown as RefObject<Element>,
    point: anchor,
    onMove: (nextPoint) => onMove(toVec2(nextPoint)),
    constrain: (point) => point,
  })

  return (
    <>
      <Polygon points={points} color={color} fillOpacity={fillOpacity} />
      <polygon
        ref={gestureRef}
        className="drag-overlay"
        points={toPolygonPoints(points)}
        fill="rgba(0, 0, 0, 0.001)"
        stroke="none"
        style={{
          transform: 'var(--mafs-view-transform)',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      />
    </>
  )
}

export function ShapeScaleDemo() {
  const [vertexCount, setVertexCount] = useState(4)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showSideLengths, setShowSideLengths] = useState(false)
  const [showAngles, setShowAngles] = useState(false)
  const [leftCenter, setLeftCenter] = useState<Vec2>(initialLeftCenter)
  const [rightCenter, setRightCenter] = useState<Vec2>(initialRightCenter)
  const [basePolygon, setBasePolygon] = useState<Vec2[]>(() =>
    createRegularPolygon(4),
  )
  const rotationRad = (rotation * Math.PI) / 180

  const leftPolygon = useMemo(
    () =>
      basePolygon.map((point) => addVec2(leftCenter, rotateVec2(point, rotationRad))),
    [basePolygon, leftCenter, rotationRad],
  )
  const rightPolygon = useMemo(
    () =>
      basePolygon.map((point) =>
        addVec2(rightCenter, scaleVec2(rotateVec2(point, rotationRad), scale)),
      ),
    [basePolygon, rightCenter, rotationRad, scale],
  )

  const handleVertexCountChange = (value: number) => {
    setVertexCount(value)
    setBasePolygon(createRegularPolygon(value))
  }

  const handleMoveLeftPoint = (index: number, point: Vec2) => {
    const localPoint = inverseRotateVec2(subVec2(point, leftCenter), rotationRad)
    setBasePolygon((prev) => {
      const next = [...prev]
      next[index] = localPoint
      return next
    })
  }

  const handleMoveRightPoint = (index: number, point: Vec2) => {
    const moved = subVec2(point, rightCenter)
    const unscaled = scaleVec2(moved, 1 / scale)
    const localPoint = inverseRotateVec2(unscaled, rotationRad)
    setBasePolygon((prev) => {
      const next = [...prev]
      next[index] = localPoint
      return next
    })
  }

  return (
    <section className="shape-scale-demo">
      <Typography.Title level={3}>图形的放大和缩小</Typography.Title>
      <Typography.Paragraph>
        支持调整多边形顶点数、统一旋转角度与缩放。可拖拽任意顶点，左右图形同步变形；左右图形可各自整体拖动。
      </Typography.Paragraph>

      <div className="canvas-wrap">
        <Mafs viewBox={{ x: [-8, 8], y: [-5, 5] }}>
          <Coordinates.Cartesian />
          <DraggablePolygon
            points={leftPolygon}
            color="#1677ff"
            fillOpacity={0.2}
            anchor={leftCenter}
            onMove={setLeftCenter}
          />
          <DraggablePolygon
            points={rightPolygon}
            color="#fa8c16"
            fillOpacity={0.25}
            anchor={rightCenter}
            onMove={setRightCenter}
          />
          <PolygonAnnotations
            points={leftPolygon}
            color="#0958d9"
            showSideLengths={showSideLengths}
            showAngles={showAngles}
          />
          <PolygonAnnotations
            points={rightPolygon}
            color="#d46b08"
            showSideLengths={showSideLengths}
            showAngles={showAngles}
          />
          {leftPolygon.map((point, index) => (
            <MovablePoint
              key={`left-${index}`}
              point={point}
              color="#1677ff"
              onMove={(nextPoint) => handleMoveLeftPoint(index, toVec2(nextPoint))}
            />
          ))}
          {rightPolygon.map((point, index) => (
            <MovablePoint
              key={`right-${index}`}
              point={point}
              color="#fa8c16"
              onMove={(nextPoint) => handleMoveRightPoint(index, toVec2(nextPoint))}
            />
          ))}
        </Mafs>
      </div>

      <div className="scale-panel">
        <div className="switch-row">
          <Typography.Text strong>显示边长</Typography.Text>
          <Switch checked={showSideLengths} onChange={setShowSideLengths} />
        </div>

        <div className="switch-row">
          <Typography.Text strong>显示角度</Typography.Text>
          <Switch checked={showAngles} onChange={setShowAngles} />
        </div>

        <div className="control-row">
          <Typography.Text strong>顶点数：{vertexCount}</Typography.Text>
          <Slider
            min={3}
            max={10}
            step={1}
            value={vertexCount}
            onChange={handleVertexCountChange}
          />
        </div>

        <div className="control-row">
          <Typography.Text strong>旋转角度：{rotation}°</Typography.Text>
          <Slider
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={setRotation}
          />
        </div>

        <Typography.Text strong>缩放倍数：{scale.toFixed(1)}x</Typography.Text>
        <Slider
          min={0.5}
          max={3}
          step={0.1}
          value={scale}
          onChange={setScale}
        />
      </div>
    </section>
  )
}
