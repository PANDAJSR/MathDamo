import { Button, InputNumber, Segmented, Tag, Typography } from 'antd'
import type { RefObject } from 'react'
import type { AngleDirection, RotationMode } from './useWheelSpin'
import { getLabelLayout, type WheelItem, type WheelSegment } from './wheelMath'
import './WheelBoard.css'

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
  showPointerAngle: boolean
  pointerAngle: number
  showBoardAngle: boolean
  showAngleControl: boolean
  angleControlDirection: AngleDirection
  angleControlDirectionOptions: Array<{ label: string; value: AngleDirection }>
  angleControlValue: number
  angleControlDisabled: boolean
  pointerElementRef: RefObject<HTMLDivElement | null>
  wheelBoardRef: RefObject<HTMLDivElement | null>
  spinButtonRef: RefObject<HTMLButtonElement | null>
  onSpinButtonClick: () => void
  onAngleDirectionChange: (value: AngleDirection) => void
  onAngleValueChange: (value: number | null) => void
  onAngleRotate: () => void
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
  showPointerAngle,
  pointerAngle,
  showBoardAngle,
  showAngleControl,
  angleControlDirection,
  angleControlDirectionOptions,
  angleControlValue,
  angleControlDisabled,
  pointerElementRef,
  wheelBoardRef,
  spinButtonRef,
  onSpinButtonClick,
  onAngleDirectionChange,
  onAngleValueChange,
  onAngleRotate,
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

      <div
        className={`wheel-board ${pointerInCenter ? 'wheel-board--pointer' : ''} ${showAngleControl ? 'wheel-board--angle-control' : ''}`}
        ref={wheelBoardRef}
      >
        {pointerInCenter ? (
          <div
            ref={pointerElementRef}
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
                <span className="wheel-label-title">{item.label || '未命名'}</span>
                {showBoardAngle ? (
                  <span className="wheel-label-angle">{segment.span.toFixed(1)}°</span>
                ) : null}
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
        {pointerInCenter && showPointerAngle ? (
          <Typography.Text className="wheel-pointer-angle">{pointerAngle.toFixed(1)}°</Typography.Text>
        ) : null}
        {showAngleControl ? (
          <div className="wheel-angle-control">
            <Typography.Text className="wheel-angle-control__title">角度控制</Typography.Text>
            <Segmented
              block
              options={angleControlDirectionOptions}
              value={angleControlDirection}
              onChange={(value) => onAngleDirectionChange(value as AngleDirection)}
              disabled={angleControlDisabled}
            />
            <InputNumber
              className="wheel-angle-control__input"
              min={0}
              step={1}
              value={angleControlValue}
              addonAfter="°"
              onChange={onAngleValueChange}
              disabled={angleControlDisabled}
            />
            <Button type="primary" block onClick={onAngleRotate} disabled={angleControlDisabled || angleControlValue <= 0}>
              旋转
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
