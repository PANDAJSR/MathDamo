import { Slider, Switch, Typography } from 'antd'
import { Coordinates, Mafs, MovablePoint, Polygon, useMovable } from 'mafs'
import { useMemo, useRef, useState, type RefObject } from 'react'
import 'mafs/core.css'
import './ShapeScaleDemo.css'
import { PointLabels, PolygonAnnotations } from './shapeScale/annotations'
import {
  addVec2,
  createRegularPolygon,
  distance,
  formatRatio,
  initialLeftCenter,
  initialRightCenter,
  inverseRotateVec2,
  normalizeRatio,
  rotateVec2,
  scaleVec2,
  snapToHalfGrid,
  subVec2,
  toPolygonPoints,
  toVec2,
  type Vec2,
} from './shapeScale/geometry'

interface DraggablePolygonProps {
  points: Vec2[]
  color: string
  fillOpacity: number
  anchor: Vec2
  onMove: (point: Vec2) => void
  constrain: (point: Vec2) => Vec2
}

function DraggablePolygon({
  points,
  color,
  fillOpacity,
  anchor,
  onMove,
  constrain,
}: DraggablePolygonProps) {
  const gestureRef = useRef<SVGPolygonElement>(null)
  const { dragging } = useMovable({
    gestureTarget: gestureRef as unknown as RefObject<Element>,
    point: anchor,
    onMove: (nextPoint) => onMove(toVec2(nextPoint)),
    constrain,
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
  const [snapMode, setSnapMode] = useState(false)
  const [showSideLengths, setShowSideLengths] = useState(false)
  const [showAngles, setShowAngles] = useState(false)
  const [leftCenter, setLeftCenter] = useState<Vec2>(initialLeftCenter)
  const [rightCenter, setRightCenter] = useState<Vec2>(initialRightCenter)
  const [basePolygon, setBasePolygon] = useState<Vec2[]>(() =>
    createRegularPolygon(4),
  )

  const rotationRad = (rotation * Math.PI) / 180
  const constrainPoint = snapMode ? snapToHalfGrid : (point: Vec2) => point

  const leftPolygon = useMemo(
    () =>
      basePolygon.map((point) =>
        addVec2(leftCenter, rotateVec2(point, rotationRad)),
      ),
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

  const leftAB = distance(leftPolygon[0], leftPolygon[1])
  const leftBC = distance(leftPolygon[1], leftPolygon[2])
  const rightAB = distance(rightPolygon[0], rightPolygon[1])
  const rightBC = distance(rightPolygon[1], rightPolygon[2])

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
            constrain={constrainPoint}
          />

          <DraggablePolygon
            points={rightPolygon}
            color="#fa8c16"
            fillOpacity={0.25}
            anchor={rightCenter}
            onMove={setRightCenter}
            constrain={constrainPoint}
          />

          <PolygonAnnotations
            points={leftPolygon}
            color="#ffffff"
            showSideLengths={showSideLengths}
            showAngles={showAngles}
          />

          <PolygonAnnotations
            points={rightPolygon}
            color="#ffffff"
            showSideLengths={showSideLengths}
            showAngles={showAngles}
          />

          <PointLabels points={leftPolygon} labels={['A', 'B', 'C']} color="#ffffff" />

          <PointLabels
            points={rightPolygon}
            labels={["A'", "B'", "C'"]}
            color="#ffffff"
          />

          {leftPolygon.map((point, index) => (
            <MovablePoint
              key={`left-${index}`}
              point={point}
              color="#1677ff"
              constrain={constrainPoint}
              onMove={(nextPoint) => handleMoveLeftPoint(index, toVec2(nextPoint))}
            />
          ))}

          {rightPolygon.map((point, index) => (
            <MovablePoint
              key={`right-${index}`}
              point={point}
              color="#fa8c16"
              constrain={constrainPoint}
              onMove={(nextPoint) => handleMoveRightPoint(index, toVec2(nextPoint))}
            />
          ))}
        </Mafs>
      </div>

      <div className="scale-panel">
        <div className="switch-grid">
          <div className="switch-row">
            <Typography.Text strong>吸附模式（半格）</Typography.Text>
            <Switch checked={snapMode} onChange={setSnapMode} />
          </div>

          <div className="switch-row">
            <Typography.Text strong>显示边长</Typography.Text>
            <Switch checked={showSideLengths} onChange={setShowSideLengths} />
          </div>

          <div className="switch-row">
            <Typography.Text strong>显示角度</Typography.Text>
            <Switch checked={showAngles} onChange={setShowAngles} />
          </div>
        </div>

        <div className="control-grid">
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

          <div className="control-row">
            <Typography.Text strong>缩放倍数：{scale.toFixed(1)}x</Typography.Text>
            <Slider
              min={0.5}
              max={3}
              step={0.1}
              value={scale}
              onChange={setScale}
            />
          </div>
        </div>
      </div>

      <div className="info-panel">
        <Typography.Title level={4}>信息展示</Typography.Title>
        <Typography.Paragraph className="info-line">
          AB:BC = {formatRatio(leftAB, leftBC)}（实际长度） ={' '}
          {normalizeRatio(leftAB, leftBC)}（前后至少有一项为1的比）
        </Typography.Paragraph>
        <Typography.Paragraph className="info-line">
          A&apos;B&apos;:B&apos;C&apos; = {formatRatio(rightAB, rightBC)}
          （实际长度） = {normalizeRatio(rightAB, rightBC)}
          （前后至少有一项为1的比）
        </Typography.Paragraph>
      </div>
    </section>
  )
}
