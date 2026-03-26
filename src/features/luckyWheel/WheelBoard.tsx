import { Button, Tag, Typography } from 'antd'
import type { RefObject } from 'react'
import { getLabelLayout, type WheelItem, type WheelSegment } from './wheelMath'

type WheelBoardProps = {
  items: WheelItem[]
  segments: WheelSegment[]
  conicColors: string
  rotation: number
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
  rotation,
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

      <div className="wheel-board" ref={wheelBoardRef}>
        <div className="wheel-pointer" />
        <div
          className="wheel-disk"
          style={{
            background: `conic-gradient(from 0deg, ${conicColors})`,
            transform: `rotate(${rotation}deg)`,
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
