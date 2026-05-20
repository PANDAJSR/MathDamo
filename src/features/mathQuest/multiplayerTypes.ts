import type { QuestionDifficulty } from './types'

export type RoomPhase = 'lobby' | 'playing' | 'finished'

export type RoomSettings = {
  selectedTags: string[]
  selectedDifficulties: QuestionDifficulty[]
}

export type PlayerState = {
  id: string
  name: string
  score: number
  ready: boolean
  submitted: boolean
  connected: boolean
  isHost: boolean
}

export type MultiplayerRoomState = {
  code: string
  hostId: string
  phase: RoomPhase
  settings: RoomSettings
  questionIds: string[]
  currentIndex: number
  endsAt: number | null
  players: PlayerState[]
  ranking?: PlayerState[]
}

export type ClientAnswerPayload = {
  questionId: string
  selectedOptionIds?: string[]
  fillAnswer?: string
}

export type ClientMessage =
  | { type: 'createRoom'; name: string }
  | { type: 'joinRoom'; name: string; code: string }
  | { type: 'updateSettings'; settings: RoomSettings }
  | { type: 'setReady'; ready: boolean }
  | { type: 'submitAnswer'; answer: ClientAnswerPayload }
  | { type: 'leaveRoom' }

export type ServerMessage =
  | { type: 'welcome'; clientId: string }
  | { type: 'roomState'; room: MultiplayerRoomState }
  | { type: 'error'; message: string }
