import { Slider, Typography } from 'antd'
import { Coordinates, Mafs, MovablePoint, Polygon } from 'mafs'
import { useMemo, useState } from 'react'
import 'mafs/core.css'
import './ShapeScaleDemo.css'

type Vec2 = [number, number]

const leftCenter: Vec2 = [-5, 0]
const rightCenter: Vec2 = [5, 0]

function createRegularPolygon(vertexCount: number): Vec2[] {
  const [cx, cy] = leftCenter
  const radius = 2

  return Array.from({ length: vertexCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / vertexCount - Math.PI / 2
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
  })
}

function mapToRight(point: Vec2, scale: number): Vec2 {
  const [lx, ly] = leftCenter
  const [rx, ry] = rightCenter
  return [rx + (point[0] - lx) * scale, ry + (point[1] - ly) * scale]
}

function mapToLeft(point: Vec2, scale: number): Vec2 {
  const [lx, ly] = leftCenter
  const [rx, ry] = rightCenter
  return [lx + (point[0] - rx) / scale, ly + (point[1] - ry) / scale]
}

export function ShapeScaleDemo() {
  const [vertexCount, setVertexCount] = useState(4)
  const [scale, setScale] = useState(1)
  const [leftPolygon, setLeftPolygon] = useState<Vec2[]>(() =>
    createRegularPolygon(4),
  )

  const rightPolygon = useMemo(
    () => leftPolygon.map((point) => mapToRight(point, scale)),
    [leftPolygon, scale],
  )

  const handleVertexCountChange = (value: number) => {
    setVertexCount(value)
    setLeftPolygon(createRegularPolygon(value))
  }

  const handleMoveLeftPoint = (index: number, point: Vec2) => {
    setLeftPolygon((prev) => {
      const next = [...prev]
      next[index] = point
      return next
    })
  }

  const handleMoveRightPoint = (index: number, point: Vec2) => {
    const mappedLeft = mapToLeft(point, scale)
    handleMoveLeftPoint(index, mappedLeft)
  }

  return (
    <section className="shape-scale-demo">
      <Typography.Title level={3}>图形的放大和缩小</Typography.Title>
      <Typography.Paragraph>
        支持调整多边形顶点数，并拖拽顶点。左右图形实时同步，右侧仅按倍数缩放。
      </Typography.Paragraph>

      <div className="canvas-wrap">
        <Mafs viewBox={{ x: [-8, 8], y: [-5, 5] }}>
          <Coordinates.Cartesian />
          <Polygon points={leftPolygon} color="#1677ff" fillOpacity={0.2} />
          <Polygon points={rightPolygon} color="#fa8c16" fillOpacity={0.25} />
          {leftPolygon.map((point, index) => (
            <MovablePoint
              key={`left-${index}`}
              point={point}
              color="#1677ff"
              onMove={(nextPoint) => handleMoveLeftPoint(index, nextPoint)}
            />
          ))}
          {rightPolygon.map((point, index) => (
            <MovablePoint
              key={`right-${index}`}
              point={point}
              color="#fa8c16"
              onMove={(nextPoint) => handleMoveRightPoint(index, nextPoint)}
            />
          ))}
        </Mafs>
      </div>

      <div className="scale-panel">
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
