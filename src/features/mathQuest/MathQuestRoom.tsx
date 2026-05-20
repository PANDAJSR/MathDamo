import { Button, Modal, Select, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MathQuestGameBoard } from './MathQuestGameBoard'
import './MathQuestMultiplayer.css'
import type {
  ClientAnswerPayload,
  MultiplayerRoomState,
  PlayerState,
  RoomSettings,
} from './multiplayerTypes'
import type { MathQuestQuestion, QuestionDifficulty } from './types'

const difficultyOptions: Array<{ label: string; value: QuestionDifficulty }> = [
  { label: '基础', value: 'easy' },
  { label: '进阶', value: 'medium' },
  { label: '挑战', value: 'hard' },
]

type MathQuestRoomProps = {
  room: MultiplayerRoomState
  clientId: string
  availableTags: string[]
  questionBank: MathQuestQuestion[]
  onUpdateSettings: (settings: RoomSettings) => void
  onSetReady: (ready: boolean) => void
  onSubmitAnswer: (answer: ClientAnswerPayload) => void
  onLeaveRoom: () => void
}

function PlayerList({ players }: { players: PlayerState[] }) {
  return (
    <div className="math-quest-online__players">
      {players.map((player) => (
        <div key={player.id} className="math-quest-online__player">
          <strong>{player.name}</strong>
          <span>{player.isHost ? '房主' : player.ready ? '准备好了' : '未准备'}</span>
          <em>{player.connected ? `${player.score} 分` : '离线'}</em>
        </div>
      ))}
    </div>
  )
}

export function MathQuestRoom({
  room,
  clientId,
  availableTags,
  questionBank,
  onUpdateSettings,
  onSetReady,
  onSubmitAnswer,
  onLeaveRoom,
}: MathQuestRoomProps) {
  const [answer, setAnswer] = useState({ questionId: '', selectedOptionIds: [] as string[], fillAnswer: '' })
  const [timeLeft, setTimeLeft] = useState(0)
  const currentPlayer = room.players.find((player) => player.id === clientId)
  const isHost = currentPlayer?.isHost ?? false
  const currentQuestion = useMemo(() => {
    const questionId = room.questionIds[room.currentIndex]
    return questionBank.find((question) => question.id === questionId)
  }, [questionBank, room.currentIndex, room.questionIds])
  const submitted = currentPlayer?.submitted ?? false
  const tagOptions = availableTags.map((tag) => ({ label: tag, value: tag }))
  const answerQuestionId = currentQuestion?.id ?? ''
  const selectedOptionIds = useMemo(
    () => (answer.questionId === answerQuestionId ? answer.selectedOptionIds : []),
    [answer.questionId, answer.selectedOptionIds, answerQuestionId],
  )
  const fillAnswer = useMemo(
    () => (answer.questionId === answerQuestionId ? answer.fillAnswer : ''),
    [answer.fillAnswer, answer.questionId, answerQuestionId],
  )

  useEffect(() => {
    if (room.phase !== 'playing' || !room.endsAt) return undefined

    const endsAt = room.endsAt
    const syncTimeLeft = () => {
      setTimeLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    }

    syncTimeLeft()
    const timer = window.setInterval(syncTimeLeft, 250)
    return () => window.clearInterval(timer)
  }, [room.endsAt, room.phase])

  const submitFill = useCallback(() => {
    if (!currentQuestion || fillAnswer.trim().length === 0 || submitted) return

    onSubmitAnswer({
      questionId: currentQuestion.id,
      fillAnswer,
    })
  }, [currentQuestion, fillAnswer, onSubmitAnswer, submitted])

  useEffect(() => {
    if (room.phase !== 'playing' || currentQuestion?.type !== 'fill' || submitted) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^[0-9.-]$/.test(event.key)) {
        event.preventDefault()
        setAnswer((currentAnswer) => ({
          questionId: answerQuestionId,
          selectedOptionIds,
          fillAnswer: `${currentAnswer.questionId === answerQuestionId ? currentAnswer.fillAnswer : ''}${event.key}`,
        }))
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        setAnswer({
          questionId: answerQuestionId,
          selectedOptionIds,
          fillAnswer: fillAnswer.slice(0, -1),
        })
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        submitFill()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [answerQuestionId, currentQuestion, fillAnswer, room.phase, selectedOptionIds, submitFill, submitted])

  const updateTags = (selectedTags: string[]) => {
    onUpdateSettings({ ...room.settings, selectedTags })
  }

  const updateDifficulties = (selectedDifficulties: QuestionDifficulty[]) => {
    onUpdateSettings({ ...room.settings, selectedDifficulties })
  }

  const toggleOption = (optionId: string) => {
    if (!currentQuestion || submitted) return

    if (currentQuestion.type === 'single') {
      setAnswer({
        questionId: currentQuestion.id,
        fillAnswer,
        selectedOptionIds: [optionId],
      })
      return
    }

    setAnswer({
      questionId: currentQuestion.id,
      fillAnswer,
      selectedOptionIds: selectedOptionIds.includes(optionId)
        ? selectedOptionIds.filter((currentId) => currentId !== optionId)
        : [...selectedOptionIds, optionId],
    })
  }

  const submitChoice = () => {
    if (!currentQuestion || selectedOptionIds.length === 0 || submitted) return

    onSubmitAnswer({
      questionId: currentQuestion.id,
      selectedOptionIds,
    })
  }

  if (room.phase === 'lobby') {
    const ready = currentPlayer?.ready ?? false
    return (
      <section className="math-quest math-quest--center">
        <div className="math-quest-online__room">
          <span className="math-quest__eyebrow">房间号</span>
          <Typography.Title>{room.code}</Typography.Title>
          <Typography.Paragraph>把这个五位数告诉另一位玩家，对方输入后即可加入。</Typography.Paragraph>

          <div className="math-quest-online__settings">
            <label>
              <span>知识点</span>
              <Select
                mode="multiple"
                allowClear
                disabled={!isHost}
                placeholder="全部知识点"
                options={tagOptions}
                value={room.settings.selectedTags}
                onChange={updateTags}
                maxTagCount="responsive"
              />
            </label>
            <label>
              <span>难度</span>
              <Select
                mode="multiple"
                allowClear
                disabled={!isHost}
                placeholder="全部难度"
                options={difficultyOptions}
                value={room.settings.selectedDifficulties}
                onChange={updateDifficulties}
                maxTagCount="responsive"
              />
            </label>
          </div>

          <PlayerList players={room.players} />

          <div className="math-quest-online__actions">
            <Button type={ready ? 'default' : 'primary'} size="large" onClick={() => onSetReady(!ready)}>
              {ready ? '取消准备' : '准备好了'}
            </Button>
            <Button size="large" onClick={onLeaveRoom}>
              离开房间
            </Button>
          </div>
        </div>
      </section>
    )
  }

  if (room.phase === 'finished') {
    const ranking = room.ranking ?? [...room.players].sort((left, right) => right.score - left.score)
    return (
      <section className="math-quest math-quest--center">
        <div className="math-quest-online__room">
          <Typography.Title>本轮结束</Typography.Title>
          <PlayerList players={ranking} />
          <Button type="primary" size="large" onClick={onLeaveRoom}>
            返回联机大厅
          </Button>
        </div>
        <Modal open title="排名" footer={<Button onClick={onLeaveRoom}>返回联机大厅</Button>} closable={false}>
          <div className="math-quest-online__ranking">
            {ranking.map((player, index) => (
              <div key={player.id}>
                <strong>第 {index + 1} 名</strong>
                <span>{player.name}</span>
                <em>{player.score} 分</em>
              </div>
            ))}
          </div>
        </Modal>
      </section>
    )
  }

  if (!currentQuestion) {
    return (
      <section className="math-quest math-quest--center">
        <Typography.Title>正在同步题目</Typography.Title>
      </section>
    )
  }

  return (
    <MathQuestGameBoard
      currentQuestion={currentQuestion}
      questionIndex={room.currentIndex}
      totalQuestions={room.questionIds.length}
      score={currentPlayer?.score ?? 0}
      timeLeft={timeLeft}
      phase="playing"
      selectedOptionIds={selectedOptionIds}
      fillAnswer={fillAnswer}
      feedback={{ tone: 'success', text: '' }}
      disabled={submitted}
      scoreboardPlayers={room.players}
      onToggleOption={toggleOption}
      onSubmitChoice={submitChoice}
      onSubmitFill={submitFill}
      onFillInput={(value) =>
        setAnswer({
          questionId: currentQuestion.id,
          selectedOptionIds,
          fillAnswer: `${fillAnswer}${value}`,
        })
      }
      onFillBackspace={() =>
        setAnswer({
          questionId: currentQuestion.id,
          selectedOptionIds,
          fillAnswer: fillAnswer.slice(0, -1),
        })
      }
      onFillClear={() =>
        setAnswer({
          questionId: currentQuestion.id,
          selectedOptionIds,
          fillAnswer: '',
        })
      }
    />
  )
}
