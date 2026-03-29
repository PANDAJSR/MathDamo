import { useEffect, useState, type RefObject } from 'react'
import type { RotationMode } from './useWheelSpin'

const ANGLE_UPDATE_EPSILON = 0.05

function normalizeDegree(value: number) {
  return ((value % 360) + 360) % 360
}

function readVisualRotation(element: HTMLElement) {
  const transform = window.getComputedStyle(element).transform
  if (!transform || transform === 'none') return 0

  const matrix = new DOMMatrixReadOnly(transform)
  return normalizeDegree((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI)
}

type UseVisualPointerAngleParams = {
  pointerElementRef: RefObject<HTMLDivElement | null>
  pointerRotation: number
  rotationMode: RotationMode
  showPointerAngle: boolean
}

export function useVisualPointerAngle({
  pointerElementRef,
  pointerRotation,
  rotationMode,
  showPointerAngle,
}: UseVisualPointerAngleParams) {
  const [visualPointerAngle, setVisualPointerAngle] = useState(() => normalizeDegree(pointerRotation))

  useEffect(() => {
    if (rotationMode !== 'pointer' || !showPointerAngle) {
      setVisualPointerAngle(normalizeDegree(pointerRotation))
      return
    }

    let rafId = 0

    const tick = () => {
      const pointerElement = pointerElementRef.current
      const nextAngle = pointerElement ? readVisualRotation(pointerElement) : normalizeDegree(pointerRotation)

      setVisualPointerAngle((prev) =>
        Math.abs(prev - nextAngle) < ANGLE_UPDATE_EPSILON ? prev : nextAngle,
      )
      rafId = window.requestAnimationFrame(tick)
    }

    tick()

    return () => window.cancelAnimationFrame(rafId)
  }, [pointerElementRef, pointerRotation, rotationMode, showPointerAngle])

  return visualPointerAngle
}
