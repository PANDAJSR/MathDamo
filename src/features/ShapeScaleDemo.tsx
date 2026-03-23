import { Slider, Typography } from 'antd'
import { Coordinates, Mafs, Polygon } from 'mafs'
import { useMemo, useState } from 'react'
import 'mafs/core.css'
import './ShapeScaleDemo.css'

type Vec2 = [number, number]

const baseRectangle: Vec2[] = [
  [-6, -2],
  [-4, -2],
  [-4, 2],
  [-6, 2],
]

function buildScaledRectangle(scale: number): Vec2[] {
  const centerX = 5
  const centerY = 0
  const halfWidth = scale
  const halfHeight = 2 * scale

  return [
    [centerX - halfWidth, centerY - halfHeight],
    [centerX + halfWidth, centerY - halfHeight],
    [centerX + halfWidth, centerY + halfHeight],
    [centerX - halfWidth, centerY + halfHeight],
  ]
}

export function ShapeScaleDemo() {
  const [scale, setScale] = useState(1)

  const scaledRectangle = useMemo(() => buildScaledRectangle(scale), [scale])

  return (
    <section className="shape-scale-demo">
      <Typography.Title level={3}>图形的放大和缩小</Typography.Title>
      <Typography.Paragraph>
        滑动下方滑块，控制右侧长方形相对于左侧长方形的缩放倍数。
      </Typography.Paragraph>

      <div className="canvas-wrap">
        <Mafs viewBox={{ x: [-8, 8], y: [-5, 5] }}>
          <Coordinates.Cartesian />
          <Polygon points={baseRectangle} color="#1677ff" fillOpacity={0.2} />
          <Polygon points={scaledRectangle} color="#fa8c16" fillOpacity={0.25} />
        </Mafs>
      </div>

      <div className="scale-panel">
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
