import { Button, Tag, Typography } from 'antd'
import type { RefObject } from 'react'
import type { RotationMode } from './useWheelSpin'
import { getLabelLayout, type WheelItem, type WheelSegment } from './wheelMath'

type WheelBoardProps = {
  items: WheelItem[]
  segments: WheelSegment[]
  conicColors: string
  wheelRotation: number
  pointerRotation: number
  rotationMode: RotationMode
  shouldAnimateRotation: boolean
  selectedItem: WheelItem | null
  labelRadiusPercent: number
  spinDurationMs: number
  spinTimingFunction: string
  spinButtonLabel: string
  spinButtonDisabled: boolean
  wheelBoardRef: RefObject<HTMLDivElement | null>
  spinButtonRef: RefObject<HTMLButtonElement | null>
  onSpinButtonClick: () => void
}

export function WheelBoard({
  items,
  segments,
  conicColors,
  wheelRotation,
  pointerRotation,
  rotationMode,
  shouldAnimateRotation,
  selectedItem,
  labelRadiusPercent,
  spinDurationMs,
  spinTimingFunction,
  spinButtonLabel,
  spinButtonDisabled,
  wheelBoardRef,
  spinButtonRef,
  onSpinButtonClick,
}: WheelBoardProps) {
  const pointerInCenter = rotationMode === 'pointer'

  return (
    <div className="wheel-layout">
      <div className={`wheel-result ${selectedItem ? 'wheel-result--selected' : ''}`}>
        <Typography.Text className="wheel-result-title">抽取结果</Typography.Text>
        {selectedItem ? (
          <Tag className="wheel-result-tag" color={selectedItem.color}>
            {selectedItem.label}
          </Tag>
        ) : (
          <Tag className="wheel-result-tag">尚未抽取</Tag>
        )}
      </div>

      <div className={`wheel-board ${pointerInCenter ? 'wheel-board--pointer' : ''}`} ref={wheelBoardRef}>
        {pointerInCenter ? (
          <div
            className="wheel-pointer wheel-pointer--center"
            style={{
              transform: `translate(-50%, -50%) rotate(${pointerRotation}deg)`,
              transition: shouldAnimateRotation
                ? `transform ${spinDurationMs}ms ${spinTimingFunction}`
                : 'none',
            }}
          >
            <div className="wheel-pointer-needle" />
            <div className="wheel-pointer-core" />
          </div>
        ) : (
          <div className="wheel-pointer wheel-pointer--edge" />
        )}
        <div
          className="wheel-disk"
          style={{
            background: `conic-gradient(from 0deg, ${conicColors})`,
            transform: `rotate(${wheelRotation}deg)`,
            transition: shouldAnimateRotation
              ? `transform ${spinDurationMs}ms ${spinTimingFunction}`
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
          onClick={onSpinButtonClick}
          disabled={spinButtonDisabled}
        >
          {spinButtonLabel}
        </Button>
      </div>
    </div>
  )
}
