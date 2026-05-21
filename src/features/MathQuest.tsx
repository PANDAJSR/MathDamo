import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './MathQuest.css'
import {
  evaluateChoiceAnswer,
  evaluateFillAnswer,
  filterQuestions,
  getCorrectAnswerText,
  getKnowledgeTags,
  shuffleQuestions,
} from './mathQuest/game'
import { MathQuestGameBoard } from './mathQuest/MathQuestGameBoard'
import { MathQuestOnlineStart } from './mathQuest/MathQuestOnlineStart'
import { MathQuestRoom } from './mathQuest/MathQuestRoom'
import { MathQuestStart } from './mathQuest/MathQuestStart'
import questionBank from './mathQuest/questions.json'
import type { FeedbackTone } from './mathQuest/MathQuestGameBoard'
import type { MathQuestQuestion, QuestionDifficulty } from './mathQuest/types'
import { useMathQuestSocket } from './mathQuest/useMathQuestSocket'

type GamePhase = 'ready' | 'playing' | 'feedback' | 'finished'

const typedQuestionBank = questionBank as MathQuestQuestion[]
const feedbackDelayMs = 1300

export function MathQuest() {
  const socket = useMathQuestSocket()
  const [singlePlayerMode, setSinglePlayerMode] = useState(true)
  const [selectedKnowledgeTags, setSelectedKnowledgeTags] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<QuestionDifficulty[]>([])
  const [phase, setPhase] = useState<GamePhase>('ready')
  const [questions, setQuestions] = useState<MathQuestQuestion[]>(() => shuffleQuestions(typedQuestionBank))
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [fillAnswer, setFillAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimitSeconds ?? 0)
  const [feedback, setFeedback] = useState({ tone: 'success' as FeedbackTone, text: '' })
  const [wrongReview, setWrongReview] = useState<{ answer: string; explanation: string } | null>(null)
  const feedbackTimeoutRef = useRef<number | null>(null)

  const currentQuestion = questions[questionIndex]
  const availableKnowledgeTags = useMemo(() => getKnowledgeTags(typedQuestionBank), [])
  const filteredQuestionBank = useMemo(
    () => filterQuestions(typedQuestionBank, selectedKnowledgeTags, selectedDifficulties),
    [selectedDifficulties, selectedKnowledgeTags],
  )

  const resetForQuestion = useCallback((nextQuestion: MathQuestQuestion) => {
    setSelectedOptionIds([])
    setFillAnswer('')
    setTimeLeft(nextQuestion.timeLimitSeconds)
  }, [])

  const startGame = () => {
    const nextQuestions = shuffleQuestions(filteredQuestionBank)
    if (nextQuestions.length === 0) return

    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }

    setQuestions(nextQuestions)
    setQuestionIndex(0)
    setScore(0)
    setFeedback({ tone: 'success', text: '' })
    setWrongReview(null)
    resetForQuestion(nextQuestions[0])
    setPhase('playing')
  }

  const moveToNextQuestion = useCallback(() => {
    setQuestionIndex((currentIndex) => {
      const nextIndex = currentIndex + 1
      const nextQuestion = questions[nextIndex]

      if (!nextQuestion) {
        setPhase('finished')
        return currentIndex
      }

      resetForQuestion(nextQuestion)
      setPhase('playing')
      return nextIndex
    })
  }, [questions, resetForQuestion])

  const continueAfterReview = useCallback(() => {
    setWrongReview(null)
    moveToNextQuestion()
  }, [moveToNextQuestion])

  const resolveAnswer = useCallback(
    (correct: boolean, message: string) => {
      if (!currentQuestion || phase !== 'playing') return

      const delta = correct ? currentQuestion.points : -currentQuestion.points
      setScore((currentScore) => currentScore + delta)
      setFeedback({
        tone: correct ? 'success' : 'danger',
        text: correct ? message : `${message} 先别急，下一题抢回来。`,
      })
      setPhase('feedback')

      if (correct) {
        feedbackTimeoutRef.current = window.setTimeout(() => {
          feedbackTimeoutRef.current = null
          moveToNextQuestion()
        }, feedbackDelayMs)
        return
      }

      setWrongReview({
        answer: getCorrectAnswerText(currentQuestion),
        explanation: currentQuestion.explanation,
      })
    },
    [currentQuestion, moveToNextQuestion, phase],
  )

  const submitChoice = useCallback(() => {
    if (!currentQuestion || selectedOptionIds.length === 0) return
    const result = evaluateChoiceAnswer(currentQuestion, selectedOptionIds)
    resolveAnswer(result.correct, result.message)
  }, [currentQuestion, resolveAnswer, selectedOptionIds])

  const submitFill = useCallback(() => {
    if (!currentQuestion || fillAnswer.trim().length === 0) return
    const result = evaluateFillAnswer(currentQuestion, fillAnswer)
    resolveAnswer(result.correct, result.message)
  }, [currentQuestion, fillAnswer, resolveAnswer])

  useEffect(() => {
    if (phase !== 'playing') return undefined

    const timer = window.setInterval(() => {
      setTimeLeft((currentTimeLeft) => {
        if (currentTimeLeft <= 1) {
          window.clearInterval(timer)
          resolveAnswer(false, `时间到，扣除 ${currentQuestion.points} 分。`)
          return 0
        }

        return currentTimeLeft - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [currentQuestion, phase, resolveAnswer])

  useEffect(() => {
    if (phase !== 'playing' || currentQuestion?.type !== 'fill') return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^[0-9.π-]$/.test(event.key)) {
        event.preventDefault()
        setFillAnswer((currentValue) => currentValue + event.key)
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        setFillAnswer((currentValue) => currentValue.slice(0, -1))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        submitFill()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, phase, submitFill])

  const toggleOption = (optionId: string) => {
    if (!currentQuestion || phase !== 'playing') return

    if (currentQuestion.type === 'single') {
      setSelectedOptionIds([optionId])
      return
    }

    setSelectedOptionIds((currentIds) =>
      currentIds.includes(optionId)
        ? currentIds.filter((currentId) => currentId !== optionId)
        : [...currentIds, optionId],
    )
  }

  const openMultiplayerHome = () => {
    setSinglePlayerMode(false)
    setPhase('ready')
  }

  const backHome = useCallback(() => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }

    if (socket.roomState) {
      socket.leaveRoom()
    }

    setSinglePlayerMode(true)
    setPhase('ready')
    setQuestionIndex(0)
    setScore(0)
    setSelectedOptionIds([])
    setFillAnswer('')
    setFeedback({ tone: 'success', text: '' })
    setWrongReview(null)
  }, [socket])

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  if (socket.roomState) {
    return (
      <MathQuestRoom
        room={socket.roomState}
        clientId={socket.clientId}
        availableTags={availableKnowledgeTags}
        questionBank={typedQuestionBank}
        onUpdateSettings={socket.updateSettings}
        onSetReady={socket.setReady}
        onSubmitAnswer={socket.submitAnswer}
        onLeaveRoom={socket.leaveRoom}
        onBackHome={backHome}
      />
    )
  }

  if (!singlePlayerMode && phase === 'ready') {
    return (
      <MathQuestOnlineStart
        connected={socket.connected}
        error={socket.error}
        serverAddress={socket.serverAddress}
        socketUrl={socket.socketUrl}
        onServerAddressChange={socket.setServerAddress}
        onCreateRoom={socket.createRoom}
        onJoinRoom={socket.joinRoom}
        onSinglePlayer={() => setSinglePlayerMode(true)}
        onBackHome={backHome}
      />
    )
  }

  if (phase === 'ready' || !currentQuestion) {
    return (
      <MathQuestStart
        availableTags={availableKnowledgeTags}
        playableQuestionCount={filteredQuestionBank.length}
        selectedTags={selectedKnowledgeTags}
        selectedDifficulties={selectedDifficulties}
        onSelectedTagsChange={setSelectedKnowledgeTags}
        onSelectedDifficultiesChange={setSelectedDifficulties}
        onStart={startGame}
        connectionText={singlePlayerMode ? undefined : socket.error || '正在连接联机服务器，可先单人练习。'}
        onBackHome={backHome}
        onOpenMultiplayer={openMultiplayerHome}
      />
    )
  }

  if (phase === 'finished') {
    return (
      <MathQuestStart
        availableTags={availableKnowledgeTags}
        playableQuestionCount={filteredQuestionBank.length}
        selectedTags={selectedKnowledgeTags}
        selectedDifficulties={selectedDifficulties}
        onSelectedTagsChange={setSelectedKnowledgeTags}
        onSelectedDifficultiesChange={setSelectedDifficulties}
        onStart={startGame}
        score={score}
        completedQuestionCount={questions.length}
        connectionText={singlePlayerMode ? undefined : socket.error || '正在连接联机服务器，可先单人练习。'}
        onBackHome={backHome}
        onOpenMultiplayer={openMultiplayerHome}
      />
    )
  }

  return (
    <MathQuestGameBoard
      currentQuestion={currentQuestion}
      questionIndex={questionIndex}
      totalQuestions={questions.length}
      score={score}
      timeLeft={timeLeft}
      phase={phase}
      selectedOptionIds={selectedOptionIds}
      fillAnswer={fillAnswer}
      feedback={feedback}
      wrongReview={wrongReview}
      onToggleOption={toggleOption}
      onSubmitChoice={submitChoice}
      onSubmitFill={submitFill}
      onFillInput={(value) => setFillAnswer((currentValue) => currentValue + value)}
      onFillBackspace={() => setFillAnswer((currentValue) => currentValue.slice(0, -1))}
      onFillClear={() => setFillAnswer('')}
      onContinueAfterReview={continueAfterReview}
      onBackHome={backHome}
    />
  )
}
