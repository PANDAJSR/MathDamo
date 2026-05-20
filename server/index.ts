import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { WebSocket, WebSocketServer } from 'ws'
import {
  evaluateChoiceAnswer,
  evaluateFillAnswer,
  filterQuestions,
  shuffleQuestions,
} from '../src/features/mathQuest/game'
import type {
  ClientAnswerPayload,
  ClientMessage,
  MultiplayerRoomState,
  PlayerState,
  RoomPhase,
  RoomSettings,
  ServerMessage,
} from '../src/features/mathQuest/multiplayerTypes'
import type { MathQuestQuestion } from '../src/features/mathQuest/types'

type Player = PlayerState & {
  socket: WebSocket
}

type Room = {
  code: string
  hostId: string
  phase: RoomPhase
  settings: RoomSettings
  questionIds: string[]
  currentIndex: number
  endsAt: number | null
  players: Map<string, Player>
  ranking?: PlayerState[]
  timer?: ReturnType<typeof setTimeout>
}

const host = '0.0.0.0'
const port = 12478
const rooms = new Map<string, Room>()
const questionBank = JSON.parse(
  readFileSync(new URL('../src/features/mathQuest/questions.json', import.meta.url), 'utf8'),
) as MathQuestQuestion[]

const wss = new WebSocketServer({ host, port })

function createPlayer(id: string, name: string, socket: WebSocket, isHost: boolean): Player {
  return {
    id,
    name: name.trim().slice(0, 16) || '玩家',
    score: 0,
    ready: false,
    submitted: false,
    connected: true,
    isHost,
    socket,
  }
}

function serializeRoom(room: Room): MultiplayerRoomState {
  const players = Array.from(room.players.values()).map(toPlayerState)

  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    settings: room.settings,
    questionIds: room.questionIds,
    currentIndex: room.currentIndex,
    endsAt: room.endsAt,
    players,
    ranking: room.ranking,
  }
}

function toPlayerState(player: Player): PlayerState {
  return {
    id: player.id,
    name: player.name,
    score: player.score,
    ready: player.ready,
    submitted: player.submitted,
    connected: player.connected,
    isHost: player.isHost,
  }
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

function broadcast(room: Room) {
  const message: ServerMessage = { type: 'roomState', room: serializeRoom(room) }
  room.players.forEach((player) => send(player.socket, message))
}

function sendError(socket: WebSocket, message: string) {
  send(socket, { type: 'error', message })
}

function createRoomCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = String(Math.floor(10000 + Math.random() * 90000))
    if (!rooms.has(code)) return code
  }

  return String(Date.now()).slice(-5)
}

function getRoomByPlayer(clientId: string) {
  return Array.from(rooms.values()).find((room) => room.players.has(clientId))
}

function getCurrentQuestion(room: Room) {
  const questionId = room.questionIds[room.currentIndex]
  return questionBank.find((question) => question.id === questionId)
}

function makeRanking(room: Room) {
  return Array.from(room.players.values())
    .map(toPlayerState)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'zh-Hans-CN'))
}

function finishRoom(room: Room) {
  if (room.timer) windowClearTimeout(room.timer)
  room.phase = 'finished'
  room.endsAt = null
  room.ranking = makeRanking(room)
  room.players.forEach((player) => {
    player.ready = false
    player.submitted = false
  })
  broadcast(room)
}

function scheduleQuestion(room: Room) {
  const question = getCurrentQuestion(room)
  if (!question) {
    finishRoom(room)
    return
  }

  if (room.timer) windowClearTimeout(room.timer)
  room.endsAt = Date.now() + question.timeLimitSeconds * 1000
  room.players.forEach((player) => {
    player.submitted = !player.connected
  })
  room.timer = setTimeout(() => advanceQuestion(room), question.timeLimitSeconds * 1000 + 250)
  broadcast(room)
}

function advanceQuestion(room: Room) {
  if (room.phase !== 'playing') return

  if (room.timer) windowClearTimeout(room.timer)
  const nextIndex = room.currentIndex + 1
  if (nextIndex >= room.questionIds.length) {
    finishRoom(room)
    return
  }

  room.currentIndex = nextIndex
  scheduleQuestion(room)
}

function maybeAdvanceAfterSubmit(room: Room) {
  const activePlayers = Array.from(room.players.values()).filter((player) => player.connected)
  const allSubmitted = activePlayers.length > 0 && activePlayers.every((player) => player.submitted)

  if (allSubmitted) {
    if (room.timer) windowClearTimeout(room.timer)
    room.timer = setTimeout(() => advanceQuestion(room), 650)
  }

  broadcast(room)
}

function maybeStartRoom(room: Room) {
  if (room.phase !== 'lobby') return

  const activePlayers = Array.from(room.players.values()).filter((player) => player.connected)
  const allReady = activePlayers.length > 0 && activePlayers.every((player) => player.ready)
  if (!allReady) {
    broadcast(room)
    return
  }

  const filteredQuestions = filterQuestions(
    questionBank,
    room.settings.selectedTags,
    room.settings.selectedDifficulties,
  )
  if (filteredQuestions.length === 0) {
    broadcast(room)
    return
  }

  room.phase = 'playing'
  room.questionIds = shuffleQuestions(filteredQuestions).map((question) => question.id)
  room.currentIndex = 0
  room.ranking = undefined
  room.players.forEach((player) => {
    player.score = 0
    player.ready = false
  })
  scheduleQuestion(room)
}

function evaluateAnswer(question: MathQuestQuestion, answer: ClientAnswerPayload) {
  if (question.type === 'fill') {
    return evaluateFillAnswer(question, answer.fillAnswer ?? '')
  }

  return evaluateChoiceAnswer(question, answer.selectedOptionIds ?? [])
}

function handleCreateRoom(clientId: string, socket: WebSocket, name: string) {
  const code = createRoomCode()
  const room: Room = {
    code,
    hostId: clientId,
    phase: 'lobby',
    settings: { selectedTags: [], selectedDifficulties: [] },
    questionIds: [],
    currentIndex: 0,
    endsAt: null,
    players: new Map([[clientId, createPlayer(clientId, name, socket, true)]]),
  }

  rooms.set(code, room)
  broadcast(room)
}

function handleJoinRoom(clientId: string, socket: WebSocket, name: string, code: string) {
  const room = rooms.get(code)
  if (!room) {
    sendError(socket, '没有找到这个房间。')
    return
  }

  if (room.phase !== 'lobby') {
    sendError(socket, '房间已经开始闯关。')
    return
  }

  room.players.set(clientId, createPlayer(clientId, name, socket, false))
  broadcast(room)
}

function handleMessage(clientId: string, socket: WebSocket, rawMessage: WebSocket.RawData) {
  let message: ClientMessage
  try {
    message = JSON.parse(rawMessage.toString()) as ClientMessage
  } catch {
    sendError(socket, '消息格式不正确。')
    return
  }

  if (message.type === 'createRoom') {
    handleCreateRoom(clientId, socket, message.name)
    return
  }

  if (message.type === 'joinRoom') {
    handleJoinRoom(clientId, socket, message.name, message.code)
    return
  }

  const room = getRoomByPlayer(clientId)
  const player = room?.players.get(clientId)
  if (!room || !player) {
    sendError(socket, '请先创建或加入房间。')
    return
  }

  if (message.type === 'leaveRoom') {
    removePlayer(clientId, true)
    return
  }

  if (message.type === 'updateSettings') {
    if (clientId === room.hostId && room.phase === 'lobby') {
      room.settings = message.settings
      broadcast(room)
    }
    return
  }

  if (message.type === 'setReady') {
    if (room.phase === 'lobby') {
      player.ready = message.ready
      maybeStartRoom(room)
    }
    return
  }

  if (message.type === 'submitAnswer' && room.phase === 'playing' && !player.submitted) {
    const question = getCurrentQuestion(room)
    if (!question || question.id !== message.answer.questionId) return

    const result = evaluateAnswer(question, message.answer)
    player.score += result.correct ? question.points : -question.points
    player.submitted = true
    maybeAdvanceAfterSubmit(room)
  }
}

function removePlayer(clientId: string, forgetPlayer = false) {
  const room = getRoomByPlayer(clientId)
  if (!room) return

  const player = room.players.get(clientId)
  if (player && forgetPlayer) {
    room.players.delete(clientId)
  } else if (player) {
    player.connected = false
    player.submitted = true
    player.ready = false
  }

  const connectedPlayers = Array.from(room.players.values()).filter((currentPlayer) => currentPlayer.connected)
  if (connectedPlayers.length === 0) {
    if (room.timer) windowClearTimeout(room.timer)
    rooms.delete(room.code)
    return
  }

  if (clientId === room.hostId) {
    const nextHost = connectedPlayers[0]
    room.hostId = nextHost.id
    room.players.forEach((currentPlayer) => {
      currentPlayer.isHost = currentPlayer.id === nextHost.id
    })
  }

  if (room.phase === 'lobby') {
    maybeStartRoom(room)
    return
  }

  maybeAdvanceAfterSubmit(room)
}

function windowClearTimeout(timer: ReturnType<typeof setTimeout>) {
  clearTimeout(timer)
}

wss.on('connection', (socket) => {
  const clientId = randomUUID()
  send(socket, { type: 'welcome', clientId })

  socket.on('message', (rawMessage) => handleMessage(clientId, socket, rawMessage))
  socket.on('close', () => removePlayer(clientId))
})

console.log(`MathDamo WebSocket server listening on ws://${host}:${port}`)
