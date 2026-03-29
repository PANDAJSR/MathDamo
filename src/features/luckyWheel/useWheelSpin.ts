import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeDegree, pickAngleInsideSegment, pickWeightedIndex, type WheelItem, type WheelSegment } from './wheelMath'

const SEGMENT_EDGE_PADDING_RATIO = 0.12
const SEGMENT_EDGE_PADDING_MAX_DEG = 8
const AUTO_SETTLE_TURNS = 7
const MANUAL_SETTLE_TURNS = 2
const MANUAL_ROLL_SPEED_DPS = 720
const AUTO_SPIN_EASING = 'cubic-bezier(0.18, 0.82, 0.18, 1)'
const MANUAL_STOP_EASING = 'cubic-bezier(0, 0, 0.2, 1)'
const ANGLE_CONTROL_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const ANGLE_CONTROL_DURATION_MS = 420

export type SpinMode = 'auto' | 'manual'
export type RotationMode = 'wheel' | 'pointer'
export type AngleDirection = 'clockwise' | 'counterclockwise'

type UseWheelSpinParams = {
  items: WheelItem[]
  segments: WheelSegment[]
  spinDurationMs: number
}

export function useWheelSpin({ items, segments, spinDurationMs }: UseWheelSpinParams) {
  const [wheelRotation, setWheelRotation] = useState(0)
  const [pointerRotation, setPointerRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [spinMode, setSpinMode] = useState<SpinMode>('auto')
  const [rotationMode, setRotationMode] = useState<RotationMode>('wheel')
  const [manualRolling, setManualRolling] = useState(false)
  const [transitionTimingFunction, setTransitionTimingFunction] = useState(AUTO_SPIN_EASING)
  const [activeDurationMs, setActiveDurationMs] = useState(spinDurationMs)
  const rotationRef = useRef(0)
  const spinTimerRef = useRef<number | null>(null)
  const angleControlTimerRef = useRef<number | null>(null)
  const manualRafRef = useRef<number | null>(null)
  const manualStartTimeRef = useRef<number | null>(null)
  const manualBaseRotationRef = useRef(0)

  const setActiveRotation = (nextRotation: number) => {
    if (rotationMode === 'wheel') {
      setWheelRotation(nextRotation)
      return
    }
    setPointerRotation(nextRotation)
  }

  useEffect(() => {
    rotationRef.current = rotationMode === 'wheel' ? wheelRotation : pointerRotation
  }, [pointerRotation, rotationMode, wheelRotation])

  const clearSpinTimer = () => {
    if (spinTimerRef.current === null) return
    window.clearTimeout(spinTimerRef.current)
    spinTimerRef.current = null
  }

  const clearAngleControlTimer = () => {
    if (angleControlTimerRef.current === null) return
    window.clearTimeout(angleControlTimerRef.current)
    angleControlTimerRef.current = null
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
    const targetOffset =
      rotationMode === 'wheel'
        ? normalizeDegree(-targetAngle - current)
        : normalizeDegree(targetAngle - current)
    const nextRotation = currentRotation + turns * 360 + targetOffset

    clearSpinTimer()
    setSelectedId(null)
    setSpinning(true)
    setManualRolling(false)
    setTransitionTimingFunction(easing)
    setActiveDurationMs(spinDurationMs)
    setActiveRotation(nextRotation)

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
      setActiveRotation(manualBaseRotationRef.current + elapsedSeconds * MANUAL_ROLL_SPEED_DPS)
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

  const handleSpinModeChange = (nextSpinMode: SpinMode) => {
    if (nextSpinMode === spinMode) return

    setSpinMode(nextSpinMode)
    if (nextSpinMode === 'manual' || !manualRolling) return

    stopManualRaf()
    settleToWinner(MANUAL_SETTLE_TURNS, MANUAL_STOP_EASING)
  }

  const resetWheelBoardState = () => {
    clearSpinTimer()
    clearAngleControlTimer()
    stopManualRaf()
    setWheelRotation(0)
    setPointerRotation(0)
    setSpinning(false)
    setSelectedId(null)
    setManualRolling(false)
    setActiveDurationMs(spinDurationMs)
  }

  const rotateByAngle = (direction: AngleDirection, angle: number) => {
    if (spinning || manualRolling) return
    const sanitizedAngle = Number.isFinite(angle) ? Math.max(0, angle) : 0
    if (sanitizedAngle <= 0) return

    const signedAngle =
      (rotationMode === 'wheel' && direction === 'clockwise') ||
      (rotationMode === 'pointer' && direction === 'counterclockwise')
        ? sanitizedAngle
        : -sanitizedAngle

    setSelectedId(null)
    setTransitionTimingFunction(ANGLE_CONTROL_EASING)
    setActiveDurationMs(ANGLE_CONTROL_DURATION_MS)
    setActiveRotation(rotationRef.current + signedAngle)
    clearAngleControlTimer()
    angleControlTimerRef.current = window.setTimeout(() => {
      setActiveDurationMs(spinDurationMs)
      angleControlTimerRef.current = null
    }, ANGLE_CONTROL_DURATION_MS)
  }

  useEffect(() => {
    return () => {
      clearSpinTimer()
      clearAngleControlTimer()
      stopManualRaf()
    }
  }, [])

  const spinButtonLabel = useMemo(() => {
    if (spinMode === 'manual') {
      if (manualRolling) return '点击停止'
      return spinning ? '抽取中...' : '开始抽取'
    }
    return spinning ? '抽取中...' : '开始抽取'
  }, [manualRolling, spinMode, spinning])

  const spinButtonDisabled = items.length === 0 || (spinning && !manualRolling)
  const shouldAnimateRotation = (spinning && !manualRolling) || activeDurationMs !== spinDurationMs

  return {
    wheelRotation,
    pointerRotation,
    spinning,
    selectedId,
    spinMode,
    rotationMode,
    spinButtonLabel,
    spinButtonDisabled,
    shouldAnimateRotation,
    activeDurationMs,
    transitionTimingFunction,
    setSpinMode: handleSpinModeChange,
    setRotationMode,
    onSpinButtonClick,
    rotateByAngle,
    resetWheelBoardState,
  }
}
