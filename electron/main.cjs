const { app, BrowserWindow } = require('electron')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { WebSocket, WebSocketServer } = require('ws')

const isDev = !app.isPackaged
const port = 12478
const rooms = new Map()
let wss = null

function getResourcePath(...parts) {
  return path.join(isDev ? path.join(__dirname, '..') : app.getAppPath(), ...parts)
}

function loadQuestionBank() {
  const questionPath = getResourcePath('src', 'features', 'mathQuest', 'questions.json')
  return JSON.parse(readFileSync(questionPath, 'utf8'))
}

const questionBank = loadQuestionBank()

function shuffleQuestions(questions) {
  return [...questions]
    .map((question) => ({ question, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ question }) => question)
}

function filterQuestions(questions, selectedTags, selectedDifficulties) {
  const selectedTagSet = new Set(selectedTags)
  const selectedDifficultySet = new Set(selectedDifficulties)

  return questions.filter((question) => {
    const matchesTag =
      selectedTagSet.size === 0 || question.knowledgeTags.some((tag) => selectedTagSet.has(tag))
    const matchesDifficulty =
      selectedDifficultySet.size === 0 || selectedDifficultySet.has(question.difficulty)

    return matchesTag && matchesDifficulty
  })
}

function evaluateChoiceAnswer(question, selectedOptionIds) {
  const expected = [...(question.answerOptionIds || [])].sort()
  const selected = [...selectedOptionIds].sort()
  return expected.length === selected.length && expected.every((optionId, index) => optionId === selected[index])
}

function evaluateFillAnswer(question, value) {
  const pattern = question.answerPattern ? new RegExp(question.answerPattern, 'i') : /^$/
  return pattern.test(String(value || '').trim())
}

function createPlayer(id, name, socket, isHost) {
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

function toPlayerState(player) {
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

function serializeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    settings: room.settings,
    questionIds: room.questionIds,
    currentIndex: room.currentIndex,
    endsAt: room.endsAt,
    players: Array.from(room.players.values()).map(toPlayerState),
    ranking: room.ranking,
  }
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

function broadcast(room) {
  const message = { type: 'roomState', room: serializeRoom(room) }
  room.players.forEach((player) => send(player.socket, message))
}

function sendError(socket, message) {
  send(socket, { type: 'error', message })
}

function createRoomCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = String(Math.floor(10000 + Math.random() * 90000))
    if (!rooms.has(code)) return code
  }

  return String(Date.now()).slice(-5)
}

function getRoomByPlayer(clientId) {
  return Array.from(rooms.values()).find((room) => room.players.has(clientId))
}

function getCurrentQuestion(room) {
  const questionId = room.questionIds[room.currentIndex]
  return questionBank.find((question) => question.id === questionId)
}

function makeRanking(room) {
  return Array.from(room.players.values())
    .map(toPlayerState)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'zh-Hans-CN'))
}

function finishRoom(room) {
  if (room.timer) clearTimeout(room.timer)
  room.phase = 'finished'
  room.endsAt = null
  room.ranking = makeRanking(room)
  room.players.forEach((player) => {
    player.ready = false
    player.submitted = false
  })
  broadcast(room)
}

function scheduleQuestion(room) {
  const question = getCurrentQuestion(room)
  if (!question) {
    finishRoom(room)
    return
  }

  if (room.timer) clearTimeout(room.timer)
  room.endsAt = Date.now() + question.timeLimitSeconds * 1000
  room.players.forEach((player) => {
    player.submitted = !player.connected
  })
  room.timer = setTimeout(() => advanceQuestion(room), question.timeLimitSeconds * 1000 + 250)
  broadcast(room)
}

function advanceQuestion(room) {
  if (room.phase !== 'playing') return

  if (room.timer) clearTimeout(room.timer)
  const nextIndex = room.currentIndex + 1
  if (nextIndex >= room.questionIds.length) {
    finishRoom(room)
    return
  }

  room.currentIndex = nextIndex
  scheduleQuestion(room)
}

function maybeAdvanceAfterSubmit(room) {
  const activePlayers = Array.from(room.players.values()).filter((player) => player.connected)
  const allSubmitted = activePlayers.length > 0 && activePlayers.every((player) => player.submitted)

  if (allSubmitted) {
    if (room.timer) clearTimeout(room.timer)
    room.timer = setTimeout(() => advanceQuestion(room), 650)
  }

  broadcast(room)
}

function maybeStartRoom(room) {
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

function evaluateAnswer(question, answer) {
  if (question.type === 'fill') {
    return evaluateFillAnswer(question, answer.fillAnswer)
  }

  return evaluateChoiceAnswer(question, answer.selectedOptionIds || [])
}

function handleCreateRoom(clientId, socket, name) {
  const code = createRoomCode()
  const room = {
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

function handleJoinRoom(clientId, socket, name, code) {
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

function handleMessage(clientId, socket, rawMessage) {
  let message
  try {
    message = JSON.parse(rawMessage.toString())
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
  const player = room && room.players.get(clientId)
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

    player.score += evaluateAnswer(question, message.answer) ? question.points : -question.points
    player.submitted = true
    maybeAdvanceAfterSubmit(room)
  }
}

function removePlayer(clientId, forgetPlayer = false) {
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
    if (room.timer) clearTimeout(room.timer)
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

function startSocketServer() {
  if (wss) return

  wss = new WebSocketServer({ host: '0.0.0.0', port })
  wss.on('connection', (socket) => {
    const clientId = randomUUID()
    send(socket, { type: 'welcome', clientId })

    socket.on('message', (rawMessage) => handleMessage(clientId, socket, rawMessage))
    socket.on('close', () => removePlayer(clientId))
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'MathDamo',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile(getResourcePath('dist', 'index.html'))
}

app.whenReady().then(() => {
  startSocketServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
