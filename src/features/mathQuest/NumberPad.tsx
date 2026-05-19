import { Button } from 'antd'

const numberPadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.']

type NumberPadProps = {
  disabled?: boolean
  onInput: (value: string) => void
  onBackspace: () => void
  onClear: () => void
}

export function NumberPad({ disabled = false, onInput, onBackspace, onClear }: NumberPadProps) {
  return (
    <div className="number-pad" aria-label="数字键盘">
      <div className="number-pad__keys">
        {numberPadKeys.map((key) => (
          <Button
            key={key}
            className="number-pad__key"
            disabled={disabled}
            onClick={() => onInput(key)}
          >
            {key}
          </Button>
        ))}
      </div>
      <div className="number-pad__tools">
        <Button size="large" disabled={disabled} onClick={onBackspace}>
          退格
        </Button>
        <Button size="large" disabled={disabled} onClick={onClear}>
          清空
        </Button>
      </div>
    </div>
  )
}
