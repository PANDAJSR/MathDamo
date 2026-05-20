import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ClientAnswerPayload,
  ClientMessage,
  MultiplayerRoomState,
  RoomSettings,
  ServerMessage,
} from './multiplayerTypes'

const defaultPort = '12478'
const serverAddressStorageKey = 'mathQuestServerAddress'

function getDefaultServerAddress() {
  const hostname = window.location.hostname || 'localhost'
  return `${hostname}:${defaultPort}`
}

function readServerAddress() {
  return window.localStorage.getItem(serverAddressStorageKey) || getDefaultServerAddress()
}

function getSocketUrl(address: string) {
  const trimmedAddress = address.trim() || getDefaultServerAddress()

  if (/^wss?:\/\//i.test(trimmedAddress)) {
    try {
      const url = new URL(trimmedAddress)
      if (!url.port) url.port = defaultPort
      return url.toString().replace(/\/$/, '')
    } catch {
      return getSocketUrl(getDefaultServerAddress())
    }
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const [host, port] = trimmedAddress.split(':')
  return `${protocol}//${host || 'localhost'}:${port || defaultPort}`
}

export function useMathQuestSocket() {
  const [serverAddress, setServerAddress] = useState(readServerAddress)
  const [connected, setConnected] = useState(false)
  const [clientId, setClientId] = useState('')
  const [roomState, setRoomState] = useState<MultiplayerRoomState | null>(null)
  const [error, setError] = useState('')
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const manuallyClosedRef = useRef(false)
  const socketUrl = useMemo(() => getSocketUrl(serverAddress), [serverAddress])

  useEffect(() => {
    manuallyClosedRef.current = false

    const connect = () => {
      setError('正在连接联机服务器。')
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
    serverAddress,
    socketUrl,
    setServerAddress: (nextAddress: string) => {
      const normalizedAddress = nextAddress.trim() || getDefaultServerAddress()
      window.localStorage.setItem(serverAddressStorageKey, normalizedAddress)
      setConnected(false)
      setError('正在连接联机服务器。')
      setServerAddress(normalizedAddress)
      setRoomState(null)
    },
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
