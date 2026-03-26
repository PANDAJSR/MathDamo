import { Button, Input, InputNumber, Space, Tag, Typography } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import './LuckyWheel.css'

type WheelItem = {
  id: number
  label: string
  color: string
  weight: number
}

type WheelSegment = {
  start: number
  end: number
  center: number
  span: number
}

const INITIAL_ITEMS: WheelItem[] = [
  { id: 1, label: '汉堡', color: '#f38aa8', weight: 1 },
  { id: 2, label: '意大利面', color: '#f08b8d', weight: 1 },
  { id: 3, label: '美国菜', color: '#f4d96d', weight: 1 },
  { id: 4, label: '墨西哥菜', color: '#9be4b0', weight: 1 },
  { id: 5, label: '中餐', color: '#93ddff', weight: 1 },
  { id: 6, label: '烧烤', color: '#b49cf4', weight: 1 },
]

const SPIN_DURATION_MS = 4200
const MIN_WEIGHT = 0.1
const DEFAULT_LABEL_RADIUS_PERCENT = 32
const LABEL_INSET_PERCENT = 2
const MIN_LABEL_RADIUS_PERCENT = 18
const MAX_LABEL_RADIUS_PERCENT = 46
const MAX_RADIUS_BOOST_PERCENT = 10
const LABEL_DYNAMIC_SPAN_CAP = 120

type LabelLayout = {
  x: number
  y: number
  width: number
}

function clampWeight(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return MIN_WEIGHT
  return Math.max(MIN_WEIGHT, value)
}

function pickWeightedIndex(items: WheelItem[]) {
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

function buildWheelSegments(items: WheelItem[]): WheelSegment[] {
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

function normalizeDegree(value: number) {
  return ((value % 360) + 360) % 360
}

function getLabelLayout(segment: WheelSegment, baseRadiusPercent: number): LabelLayout {
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

export function LuckyWheel() {
  const wheelBoardRef = useRef<HTMLDivElement | null>(null)
  const spinButtonRef = useRef<HTMLButtonElement | null>(null)
  const [items, setItems] = useState<WheelItem[]>(INITIAL_ITEMS)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [labelRadiusPercent, setLabelRadiusPercent] = useState(
    DEFAULT_LABEL_RADIUS_PERCENT,
  )

  const segments = useMemo(() => buildWheelSegments(items), [items])

  useEffect(() => {
    const board = wheelBoardRef.current
    const button = spinButtonRef.current
    if (!board || !button) return

    const updateLabelRadius = () => {
      const boardRect = board.getBoundingClientRect()
      const buttonRect = button.getBoundingClientRect()
      const boardSize = Math.min(boardRect.width, boardRect.height)
      if (boardSize <= 0) return

      const innerRadiusPercent = (buttonRect.width / boardSize) * 50
      const annulusMiddlePercent = (innerRadiusPercent + 50) / 2
      const nextRadius = Math.max(
        14,
        Math.min(44, annulusMiddlePercent - LABEL_INSET_PERCENT),
      )
      setLabelRadiusPercent(nextRadius)
    }

    const observer = new ResizeObserver(updateLabelRadius)
    observer.observe(board)
    observer.observe(button)
    updateLabelRadius()

    return () => observer.disconnect()
  }, [])

  const conicColors = useMemo(() => {
    if (items.length === 0) return 'transparent'

    return items
      .map((item, index) => {
        const segment = segments[index]
        if (!segment) return `${item.color} 0deg 0deg`
        const { start, end } = segment
        return `${item.color} ${start}deg ${end}deg`
      })
      .join(', ')
  }, [items, segments])

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  )

  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + clampWeight(item.weight), 0),
    [items],
  )

  const handleAddItem = () => {
    const nextId = items.length === 0 ? 1 : Math.max(...items.map((item) => item.id)) + 1
    setItems((prev) => [
      ...prev,
      { id: nextId, label: `选项${prev.length + 1}`, color: '#9dd7ff', weight: 1 },
    ])
  }

  const handleDeleteItem = (id: number) => {
    if (items.length <= 2) return
    setItems((prev) => prev.filter((item) => item.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }

  const handleUpdateItem = (id: number, patch: Partial<WheelItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const handleSpin = () => {
    if (spinning || items.length === 0) return

    const winnerIndex = pickWeightedIndex(items)
    const winnerSegment = segments[winnerIndex]
    if (!winnerSegment) return
    const winner = items[winnerIndex]
    const centerAngle = winnerSegment.center
    const current = normalizeDegree(rotation)
    const targetOffset = normalizeDegree(-centerAngle - current)
    const nextRotation = rotation + 7 * 360 + targetOffset

    setSpinning(true)
    setSelectedId(null)
    setRotation(nextRotation)

    window.setTimeout(() => {
      setSelectedId(winner.id)
      setSpinning(false)
    }, SPIN_DURATION_MS)
  }

  return (
    <section className="lucky-wheel">
      <Typography.Title level={3}>转盘</Typography.Title>
      <Typography.Paragraph>
        可添加/删除格子，自定义文字、颜色和权重。权重越高，扇区越大且被抽中的概率越高。
      </Typography.Paragraph>

      <div className="wheel-layout">
        <div className="wheel-board" ref={wheelBoardRef}>
          <div className="wheel-pointer" />
          <div
            className="wheel-disk"
            style={{
              background: `conic-gradient(from -90deg, ${conicColors})`,
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.18, 0.82, 0.18, 1)`
                : 'none',
            }}
          >
            {items.map((item, index) => {
              const segment = segments[index]
              if (!segment) return null
              const layout = getLabelLayout(segment, labelRadiusPercent)
              return (
                <div
                  key={item.id}
                  className="wheel-label"
                  style={{
                    left: `${layout.x}%`,
                    top: `${layout.y}%`,
                    width: `${layout.width}%`,
                  }}
                >
                  <span>{item.label || '未命名'}</span>
                </div>
              )
            })}
          </div>

          <Button
            ref={spinButtonRef}
            type="primary"
            className="wheel-spin-btn"
            onClick={handleSpin}
            disabled={items.length === 0 || spinning}
          >
            {spinning ? '抽取中...' : '开始抽取'}
          </Button>
        </div>

        <div className="wheel-result">
          <Typography.Text strong>抽取结果：</Typography.Text>
          {selectedItem ? <Tag color={selectedItem.color}>{selectedItem.label}</Tag> : <Tag>尚未抽取</Tag>}
        </div>
      </div>

      <div className="wheel-editor">
        <div className="wheel-editor-header">
          <Typography.Title level={4}>选项配置</Typography.Title>
          <Space>
            <Typography.Text type="secondary">权重总和：{totalWeight.toFixed(1)}</Typography.Text>
            <Button onClick={handleAddItem}>添加格子</Button>
          </Space>
        </div>

        {items.map((item) => (
          <div className="wheel-item-row" key={item.id}>
            <Input
              className="wheel-item-name"
              value={item.label}
              maxLength={20}
              placeholder="输入文字"
              onChange={(event) => handleUpdateItem(item.id, { label: event.target.value })}
            />

            <input
              className="wheel-color-input"
              type="color"
              value={item.color}
              aria-label="选择颜色"
              onChange={(event) => handleUpdateItem(item.id, { color: event.target.value })}
            />

            <InputNumber
              className="wheel-item-weight"
              min={MIN_WEIGHT}
              step={0.1}
              value={item.weight}
              addonBefore="权重"
              onChange={(value) => handleUpdateItem(item.id, { weight: clampWeight(value) })}
            />

            <Button danger disabled={items.length <= 2} onClick={() => handleDeleteItem(item.id)}>
              删除
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
