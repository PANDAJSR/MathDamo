import { Button } from 'antd'
import {
  formatGameNumber,
  getFormulaText,
  getSolutionLines,
  type Wave,
} from './game'
import './MistakeFeedback.css'

type MistakeFeedbackProps = {
  selectedIndex: number
  wave: Wave
  onContinue: () => void
}

const getOptionText = (wave: Wave, index: number) => {
  const ring = wave.rings[index]
  return `${ring.clue.symbol} = ${formatGameNumber(ring.clue.value)}`
}

export function MistakeFeedback({ selectedIndex, wave, onContinue }: MistakeFeedbackProps) {
  const matchedIndex = wave.rings.findIndex((ring) => (
    Math.abs(ring.circumference - wave.targetCircumference) < 0.01
  ))
  const correctIndex = matchedIndex >= 0 ? matchedIndex : 0
  const solutionLines = getSolutionLines(wave.clue, wave.targetCircumference)

  return (
    <div className="pi-racer-feedback" role="dialog" aria-modal="true" aria-labelledby="pi-racer-feedback-title">
      <div className="pi-racer-feedback__panel">
        <h1 id="pi-racer-feedback-title">选错了</h1>

        <section className="pi-racer-feedback__section">
          <span className="pi-racer-feedback__label">题目</span>
          <strong>
            已知{wave.clue.name} {wave.clue.symbol} = {formatGameNumber(wave.clue.value)}，匹配周长 C
          </strong>
        </section>

        <section className="pi-racer-feedback__section">
          <span className="pi-racer-feedback__label">选项</span>
          <div className="pi-racer-feedback__options">
            {wave.rings.map((ring, index) => (
              <div
                className={[
                  'pi-racer-feedback__option',
                  index === selectedIndex ? 'pi-racer-feedback__option--selected' : '',
                  index === correctIndex ? 'pi-racer-feedback__option--correct' : '',
                ].filter(Boolean).join(' ')}
                key={`${ring.clue.symbol}-${ring.clue.value}-${index}`}
              >
                <span>{index + 1}</span>
                <strong>{getOptionText(wave, index)}</strong>
                {index === selectedIndex && <em>刚才选择</em>}
                {index === correctIndex && <em>正确</em>}
              </div>
            ))}
          </div>
        </section>

        <section className="pi-racer-feedback__section">
          <span className="pi-racer-feedback__label">正确选项</span>
          <strong>{getOptionText(wave, correctIndex)}</strong>
        </section>

        <section className="pi-racer-feedback__section">
          <span className="pi-racer-feedback__label">计算过程</span>
          <div className="pi-racer-feedback__math">
            <strong>{getFormulaText(wave.clue)} = {formatGameNumber(wave.targetCircumference)}</strong>
            {solutionLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </section>

        <Button type="primary" size="large" onClick={onContinue}>
          继续挑战
        </Button>
      </div>
    </div>
  )
}
