import { Button, Progress, Segmented, Space, Statistic, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import './FlavorChallenge.css'
import {
  emptyMix,
  getActiveIngredients,
  getExpectedAmounts,
  getOrderFormula,
  ingredientMeta,
  orders,
  type IngredientKey,
  type MixAmounts,
} from './flavorChallenge/orders'

const pours = [10, 25, 50, 100]
const toleranceMl = 5

function clampVolume(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value)))
}

function formatMl(value: number) {
  return `${Math.round(value)}ml`
}

function getMixTotal(mix: MixAmounts) {
  return mix.juice + mix.water + mix.sugar
}

function getAccuracy(expected: MixAmounts, actual: MixAmounts) {
  const totalError = (Object.keys(expected) as IngredientKey[]).reduce(
    (sum, key) => sum + Math.abs(expected[key] - actual[key]),
    0,
  )

  return Math.max(0, Math.round(100 - totalError * 0.55))
}

export function FlavorChallenge() {
  const [orderIndex, setOrderIndex] = useState(0)
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientKey>('juice')
  const [mix, setMix] = useState<MixAmounts>(emptyMix)
  const [score, setScore] = useState(0)
  const [tips, setTips] = useState(0)
  const [feedback, setFeedback] = useState('选择原料，用量杯注入，接近目标比例后点击混合。')
  const [showAnswer, setShowAnswer] = useState(false)

  const order = orders[orderIndex]
  const expected = useMemo(() => getExpectedAmounts(order), [order])
  const activeIngredients = useMemo(() => getActiveIngredients(order), [order])
  const total = getMixTotal(mix)
  const remaining = order.totalMl - total
  const accuracy = getAccuracy(expected, mix)
  const canGoPrev = orderIndex > 0
  const canGoNext = orderIndex < orders.length - 1
  const selectedOptions = activeIngredients.map((key) => ({
    label: ingredientMeta[key].label,
    value: key,
  }))

  const resetCup = () => {
    setMix(emptyMix)
    setFeedback('杯子已清空，重新调配。')
    setShowAnswer(false)
  }

  const goToOrder = (nextIndex: number) => {
    const nextOrder = orders[nextIndex]
    if (!nextOrder) return

    setOrderIndex(nextIndex)
    setSelectedIngredient(nextOrder.primary)
    setMix(emptyMix)
    setFeedback('新顾客来了，先读题再注入。')
    setShowAnswer(false)
  }

  const pourIngredient = (amount: number) => {
    if (remaining <= 0) {
      message.warning('杯子已经满了，请先混合或清空。')
      return
    }

    const poured = Math.min(amount, remaining)
    setMix((current) => ({
      ...current,
      [selectedIngredient]: clampVolume(current[selectedIngredient] + poured, order.totalMl),
    }))
    setFeedback(`已注入 ${formatMl(poured)} ${ingredientMeta[selectedIngredient].label}。`)
  }

  const undoIngredient = () => {
    setMix((current) => {
      const removed = Math.min(25, current[selectedIngredient])
      if (removed === 0) return current

      setFeedback(`倒回 ${formatMl(removed)} ${ingredientMeta[selectedIngredient].label}。`)
      return {
        ...current,
        [selectedIngredient]: current[selectedIngredient] - removed,
      }
    })
  }

  const submitMix = () => {
    const totalGap = Math.abs(order.totalMl - total)
    const ingredientGap = activeIngredients.reduce(
      (maxGap, key) => Math.max(maxGap, Math.abs(expected[key] - mix[key])),
      totalGap,
    )
    const roundTip = Math.max(0, Math.round(accuracy * 0.8 - totalGap))

    setTips((current) => current + roundTip)
    setScore((current) => current + accuracy)
    setShowAnswer(true)

    if (ingredientGap <= toleranceMl) {
      setFeedback(`精准完成！本单准确度 ${accuracy}%，小费 +${roundTip}。`)
      return
    }

    setFeedback(`比例还差 ${formatMl(ingredientGap)} 左右，本单准确度 ${accuracy}%，小费 +${roundTip}。`)
  }

  return (
    <section className="flavor-challenge">
      <div className="flavor-challenge__header">
        <div>
          <Typography.Title level={3}>调味师大挑战：精准比例设定</Typography.Title>
          <Typography.Paragraph>
            根据顾客要求计算比例或百分数，用不同量杯把原料注入杯中，调配越精准分数越高。
          </Typography.Paragraph>
        </div>

        <div className="flavor-challenge__stats">
          <Statistic title="总分" value={score} />
          <Statistic title="小费" value={tips} suffix="分" />
        </div>
      </div>

      <div className="flavor-challenge__layout">
        <div className="order-board">
          <span className="order-board__customer">{order.customer}</span>
          <Typography.Title level={4}>{order.title}</Typography.Title>
          <p>{order.request}</p>

          <div className="order-board__meta">
            <span>目标容量：{formatMl(order.totalMl)}</span>
            <span>当前容量：{formatMl(total)}</span>
          </div>

          <Progress
            percent={Math.round((total / order.totalMl) * 100)}
            status={total > order.totalMl ? 'exception' : 'active'}
          />

          <div className="order-board__nav">
            <Button disabled={!canGoPrev} onClick={() => goToOrder(orderIndex - 1)}>
              上一单
            </Button>
            <span>
              第 {orderIndex + 1} / {orders.length} 单
            </span>
            <Button type="primary" disabled={!canGoNext} onClick={() => goToOrder(orderIndex + 1)}>
              下一单
            </Button>
          </div>
        </div>

        <div className="mixing-stage">
          <div className="cup">
            {activeIngredients.map((key) => {
              const height = (mix[key] / order.totalMl) * 100
              return (
                <div
                  key={key}
                  className="cup__layer"
                  style={{
                    height: `${height}%`,
                    backgroundColor: ingredientMeta[key].color,
                  }}
                >
                  {mix[key] > 0 && <span>{ingredientMeta[key].label}</span>}
                </div>
              )
            })}
            <div className="cup__mark cup__mark--top">{formatMl(order.totalMl)}</div>
            <div className="cup__mark cup__mark--mid">{formatMl(order.totalMl / 2)}</div>
          </div>

          <div className="cup-readout">
            {activeIngredients.map((key) => (
              <span key={key}>
                {ingredientMeta[key].label} {formatMl(mix[key])}
              </span>
            ))}
          </div>
        </div>

        <div className="control-board">
          <Typography.Title level={4}>调配台</Typography.Title>
          <Segmented
            block
            options={selectedOptions}
            value={selectedIngredient}
            onChange={(value) => setSelectedIngredient(value as IngredientKey)}
          />

          <div className="beaker-grid">
            {pours.map((amount) => (
              <Button key={amount} size="large" onClick={() => pourIngredient(amount)}>
                注入 {amount}ml
              </Button>
            ))}
          </div>

          <div className="action-row">
            <Space wrap>
              <Button onClick={undoIngredient}>倒回 25ml</Button>
              <Button onClick={resetCup}>清空</Button>
            </Space>
            <Button
              className="delivery-button"
              type="primary"
              onClick={submitMix}
              disabled={total === 0}
            >
              混合
              <span>交付</span>
            </Button>
          </div>

          <div className="feedback-panel">
            <strong>{feedback}</strong>
            {showAnswer && (
              <div>
                <span>{getOrderFormula(order)}</span>
                {activeIngredients.map((key) => (
                  <span key={key}>
                    {ingredientMeta[key].label}目标：{formatMl(expected[key])}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Progress
            type="dashboard"
            percent={accuracy}
            format={(value) => `${value}%`}
          />
        </div>
      </div>
    </section>
  )
}
