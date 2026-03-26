import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeDegree, pickAngleInsideSegment, pickWeightedIndex, type WheelItem, type WheelSegment } from './wheelMath'

const SEGMENT_EDGE_PADDING_RATIO = 0.12
const SEGMENT_EDGE_PADDING_MAX_DEG = 8
const AUTO_SETTLE_TURNS = 7
const MANUAL_SETTLE_TURNS = 5
const MANUAL_ROLL_SPEED_DPS = 720
const AUTO_SPIN_EASING = 'cubic-bezier(0.18, 0.82, 0.18, 1)'
const MANUAL_STOP_EASING = 'cubic-bezier(0.25, 0.1, 0.25, 1)'

export type SpinMode = 'auto' | 'manual'

type UseWheelSpinParams = {
  items: WheelItem[]
  segments: WheelSegment[]
  spinDurationMs: number
}

export function useWheelSpin({ items, segments, spinDurationMs }: UseWheelSpinParams) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [spinMode, setSpinMode] = useState<SpinMode>('auto')
  const [manualRolling, setManualRolling] = useState(false)
  const [transitionTimingFunction, setTransitionTimingFunction] = useState(AUTO_SPIN_EASING)
  const rotationRef = useRef(0)
  const spinTimerRef = useRef<number | null>(null)
  const manualRafRef = useRef<number | null>(null)
  const manualStartTimeRef = useRef<number | null>(null)
  const manualBaseRotationRef = useRef(0)

  useEffect(() => {
    rotationRef.current = rotation
  }, [rotation])

  const clearSpinTimer = () => {
    if (spinTimerRef.current === null) return
    window.clearTimeout(spinTimerRef.current)
    spinTimerRef.current = null
  }

  const stopManualRaf = () => {
    if (manualRafRef.current === null) return
    window.cancelAnimationFrame(manualRafRef.current)
    manualRafRef.current = null
    manualStartTimeRef.current = null
  }

  const settleToWinner = (turns: number, easing: string) => {
    if (items.length === 0) return
    const winnerIndex = pickWeightedIndex(items)
    const winnerSegment = segments[winnerIndex]
    if (!winnerSegment) return
    const winner = items[winnerIndex]
    const targetAngle = pickAngleInsideSegment(
      winnerSegment,
      SEGMENT_EDGE_PADDING_RATIO,
      SEGMENT_EDGE_PADDING_MAX_DEG,
    )
    const currentRotation = rotationRef.current
    const current = normalizeDegree(currentRotation)
    const targetOffset = normalizeDegree(-targetAngle - current)
    const nextRotation = currentRotation + turns * 360 + targetOffset

    clearSpinTimer()
    setSelectedId(null)
    setSpinning(true)
    setManualRolling(false)
    setTransitionTimingFunction(easing)
    setRotation(nextRotation)

    spinTimerRef.current = window.setTimeout(() => {
      setSelectedId(winner.id)
      setSpinning(false)
      spinTimerRef.current = null
    }, spinDurationMs)
  }

  const startAutoSpin = () => {
    if (spinning || items.length === 0) return
    settleToWinner(AUTO_SETTLE_TURNS, AUTO_SPIN_EASING)
  }

  const startManualRolling = () => {
    if (spinning || items.length === 0) return
    clearSpinTimer()
    stopManualRaf()
    setSelectedId(null)
    setSpinning(true)
    setManualRolling(true)
    manualBaseRotationRef.current = rotationRef.current

    const tick = (timestamp: number) => {
      if (manualStartTimeRef.current === null) manualStartTimeRef.current = timestamp
      const elapsedSeconds = (timestamp - manualStartTimeRef.current) / 1000
      setRotation(manualBaseRotationRef.current + elapsedSeconds * MANUAL_ROLL_SPEED_DPS)
      manualRafRef.current = window.requestAnimationFrame(tick)
    }

    manualRafRef.current = window.requestAnimationFrame(tick)
  }

  const stopManualAndSettle = () => {
    if (!manualRolling) return
    stopManualRaf()
    settleToWinner(MANUAL_SETTLE_TURNS, MANUAL_STOP_EASING)
  }

  const onSpinButtonClick = () => {
    if (spinMode === 'manual') {
      if (manualRolling) {
        stopManualAndSettle()
        return
      }
      if (spinning) return
      startManualRolling()
      return
    }

    startAutoSpin()
  }

  const resetWheelBoardState = () => {
    clearSpinTimer()
    stopManualRaf()
    setRotation(0)
    setSpinning(false)
    setSelectedId(null)
    setManualRolling(false)
  }

  useEffect(() => {
    return () => {
      clearSpinTimer()
      stopManualRaf()
    }
  }, [])

  useEffect(() => {
    if (spinMode === 'manual' || !manualRolling) return
    stopManualRaf()
    settleToWinner(MANUAL_SETTLE_TURNS, MANUAL_STOP_EASING)
  }, [manualRolling, spinMode])

  const spinButtonLabel = useMemo(() => {
    if (spinMode === 'manual') {
      if (manualRolling) return '点击停止'
      return spinning ? '抽取中...' : '开始抽取'
    }
    return spinning ? '抽取中...' : '开始抽取'
  }, [manualRolling, spinMode, spinning])

  const spinButtonDisabled = items.length === 0 || (spinning && !manualRolling)
  const shouldAnimateRotation = spinning && !manualRolling

  return {
    rotation,
    spinning,
    selectedId,
    spinMode,
    spinButtonLabel,
    spinButtonDisabled,
    shouldAnimateRotation,
    transitionTimingFunction,
    setSpinMode,
    onSpinButtonClick,
    resetWheelBoardState,
  }
}
