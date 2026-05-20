import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ClientAnswerPayload,
  ClientMessage,
  MultiplayerRoomState,
  RoomSettings,
  ServerMessage,
} from './multiplayerTypes'

function getSocketUrl() {
  const hostname = window.location.hostname || 'localhost'
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${hostname}:12478`
}

export function useMathQuestSocket() {
  const [connected, setConnected] = useState(false)
  const [clientId, setClientId] = useState('')
  const [roomState, setRoomState] = useState<MultiplayerRoomState | null>(null)
  const [error, setError] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const manuallyClosedRef = useRef(false)
  const socketUrl = useMemo(() => getSocketUrl(), [])

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket(socketUrl)
      socketRef.current = socket

      socket.addEventListener('open', () => {
        setConnected(true)
        setError('')
      })

      socket.addEventListener('message', (event) => {
        const message = JSON.parse(String(event.data)) as ServerMessage

        if (message.type === 'welcome') {
          setClientId(message.clientId)
          return
        }

        if (message.type === 'roomState') {
          setRoomState(message.room)
          return
        }

        setError(message.message)
      })

      socket.addEventListener('close', () => {
        setConnected(false)
        setRoomState(null)

        if (!manuallyClosedRef.current) {
          reconnectTimerRef.current = window.setTimeout(connect, 1800)
        }
      })

      socket.addEventListener('error', () => {
        setError('正在尝试连接联机服务器。')
      })
    }

    connect()
    return () => {
      manuallyClosedRef.current = true
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current)
      socketRef.current?.close()
    }
  }, [socketUrl])

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError('联机服务器还没有连接成功。')
      return
    }

    socket.send(JSON.stringify(message))
  }, [])

  return {
    clientId,
    connected,
    error,
    roomState,
    socketUrl,
    createRoom: (name: string) => send({ type: 'createRoom', name }),
    joinRoom: (name: string, code: string) => send({ type: 'joinRoom', name, code }),
    updateSettings: (settings: RoomSettings) => send({ type: 'updateSettings', settings }),
    setReady: (ready: boolean) => send({ type: 'setReady', ready }),
    submitAnswer: (answer: ClientAnswerPayload) => send({ type: 'submitAnswer', answer }),
    leaveRoom: () => {
      send({ type: 'leaveRoom' })
      setRoomState(null)
    },
  }
}
