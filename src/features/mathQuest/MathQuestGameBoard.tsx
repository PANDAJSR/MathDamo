import { Button, Modal, Progress, Statistic, Typography } from 'antd'
import { useMemo } from 'react'
import {
  getDifficultyLabel,
} from './game'
import { NumberPad } from './NumberPad'
import type { MathQuestQuestion } from './types'

export type FeedbackTone = 'success' | 'danger'

type ScoreboardPlayer = {
  id: string
  name: string
  score: number
  submitted: boolean
  connected: boolean
}

type MathQuestGameBoardProps = {
  currentQuestion: MathQuestQuestion
  questionIndex: number
  totalQuestions: number
  score: number
  timeLeft: number
  phase: 'playing' | 'feedback'
  selectedOptionIds: string[]
  fillAnswer: string
  feedback: { tone: FeedbackTone; text: string }
  disabled?: boolean
  scoreboardPlayers?: ScoreboardPlayer[]
  wrongReview?: { answer: string; explanation: string } | null
  onToggleOption: (optionId: string) => void
  onSubmitChoice: () => void
  onSubmitFill: () => void
  onFillInput: (value: string) => void
  onFillBackspace: () => void
  onFillClear: () => void
  onBackHome?: () => void
  onContinueAfterReview?: () => void
}

export function MathQuestGameBoard({
  currentQuestion,
  questionIndex,
  totalQuestions,
  score,
  timeLeft,
  phase,
  selectedOptionIds,
  fillAnswer,
  feedback,
  disabled = false,
  scoreboardPlayers = [],
  wrongReview = null,
  onToggleOption,
  onSubmitChoice,
  onSubmitFill,
  onFillInput,
  onFillBackspace,
  onFillClear,
  onBackHome,
  onContinueAfterReview,
}: MathQuestGameBoardProps) {
  const answeredCount = phase === 'feedback' ? questionIndex + 1 : questionIndex
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100)
  const isMultipleChoice = currentQuestion.type === 'multiple'
  const canSubmitChoice = selectedOptionIds.length > 0
  const canSubmitFill = fillAnswer.trim().length > 0
  const timePercent = useMemo(
    () => Math.round((timeLeft / currentQuestion.timeLimitSeconds) * 100),
    [currentQuestion.timeLimitSeconds, timeLeft],
  )

  return (
    <section className={`math-quest ${feedback.tone === 'danger' && phase === 'feedback' ? 'is-failed' : ''}`}>
      <header className="math-quest__topbar">
        <div>
          <span className="math-quest__eyebrow">趣味数学闯关</span>
          <Typography.Title level={2}>{currentQuestion.title}</Typography.Title>
        </div>
        <div className="math-quest__topbar-actions">
          {onBackHome && (
            <Button className="math-quest__home-button" onClick={onBackHome}>
              返回主页
            </Button>
          )}
          <div className="math-quest__stats">
            <Statistic title="得分" value={score} />
            <Statistic title="题目" value={questionIndex + 1} suffix={`/${totalQuestions}`} />
            <Statistic title="剩余" value={timeLeft} suffix="秒" />
          </div>
        </div>
      </header>

      {scoreboardPlayers.length > 0 && (
        <div className="math-quest-online__scores">
          {scoreboardPlayers.map((player) => (
            <span key={player.id} className={player.submitted ? 'is-submitted' : ''}>
              {player.name}：{player.score} 分
              {!player.connected ? ' · 离线' : player.submitted ? ' · 已提交' : ''}
            </span>
          ))}
        </div>
      )}

      <Progress percent={progressPercent} showInfo={false} />

      <main className="math-quest__board">
        <section className="math-quest__question">
          <div className="math-quest__meta">
            <span>{getDifficultyLabel(currentQuestion)}</span>
            <span>{currentQuestion.points} 分</span>
            <span>{currentQuestion.type === 'fill' ? '填空' : currentQuestion.type === 'multiple' ? '多选' : '单选'}</span>
            {currentQuestion.knowledgeTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className="math-quest__prompt">{currentQuestion.prompt}</div>
          <Progress
            percent={timePercent}
            strokeColor={timePercent <= 25 ? '#ef4444' : '#16a34a'}
            showInfo={false}
          />
        </section>

        {currentQuestion.type === 'fill' ? (
          <section className="math-quest__fill">
            <div className="math-quest__answer-display" aria-label="填空答案">
              {fillAnswer || currentQuestion.answerHint || '输入答案'}
            </div>
            <NumberPad
              disabled={phase !== 'playing' || disabled}
              onInput={onFillInput}
              onBackspace={onFillBackspace}
              onClear={onFillClear}
            />
            <Button
              className="math-quest__submit"
              type="primary"
              disabled={phase !== 'playing' || disabled || !canSubmitFill}
              onClick={onSubmitFill}
            >
              {disabled ? '等待其他玩家' : '提交答案'}
            </Button>
          </section>
        ) : (
          <section className="math-quest__options">
            {currentQuestion.options?.map((option, index) => {
              const selected = selectedOptionIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  className={`math-quest__option ${selected ? 'is-selected' : ''}`}
                  disabled={phase !== 'playing' || disabled}
                  onClick={() => onToggleOption(option.id)}
                >
                  <span>{String.fromCharCode(65 + index)}</span>
                  <strong>{option.label}</strong>
                </button>
              )
            })}
            <Button
              className="math-quest__submit"
              type="primary"
              disabled={phase !== 'playing' || disabled || !canSubmitChoice}
              onClick={onSubmitChoice}
            >
              {disabled ? '等待其他玩家' : isMultipleChoice ? '提交多选' : '确认选择'}
            </Button>
          </section>
        )}
      </main>

      {phase === 'feedback' && (
        <div className={`math-quest__feedback math-quest__feedback--${feedback.tone}`}>
          {feedback.tone === 'danger' ? '挑战受阻' : '闯关成功'}
          <span>{feedback.text}</span>
        </div>
      )}

      <Modal
        open={Boolean(wrongReview)}
        title="正确答案和解析"
        okText="继续闯关"
        cancelButtonProps={{ style: { display: 'none' } }}
        closable={false}
        maskClosable={false}
        onOk={onContinueAfterReview}
      >
        <div className="math-quest__review">
          <div>
            <strong>正确答案</strong>
            <span>{wrongReview?.answer}</span>
          </div>
          <div>
            <strong>为什么是这个答案</strong>
            <p>{wrongReview?.explanation}</p>
          </div>
        </div>
      </Modal>
    </section>
  )
}
