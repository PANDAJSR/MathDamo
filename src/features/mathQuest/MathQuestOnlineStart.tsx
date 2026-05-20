import { Button, Input, Modal, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import './MathQuestMultiplayer.css'

declare global {
  interface Window {
    mathDamo?: {
      getLocalIps: () => Promise<string[]>
    }
  }
}

type MathQuestOnlineStartProps = {
  connected: boolean
  error: string
  serverAddress: string
  socketUrl: string
  onServerAddressChange: (address: string) => void
  onCreateRoom: (name: string) => void
  onJoinRoom: (name: string, code: string) => void
  onSinglePlayer: () => void
  onBackHome: () => void
}

type DialogMode = 'create' | 'join' | null

export function MathQuestOnlineStart({
  connected,
  error,
  serverAddress,
  socketUrl,
  onServerAddressChange,
  onCreateRoom,
  onJoinRoom,
  onSinglePlayer,
  onBackHome,
}: MathQuestOnlineStartProps) {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [addressDraft, setAddressDraft] = useState(serverAddress)
  const [localIps, setLocalIps] = useState<string[]>([])
  const trimmedName = name.trim()
  const normalizedCode = roomCode.trim()
  const canConfirm = trimmedName.length > 0 && (dialogMode === 'create' || /^\d{5}$/.test(normalizedCode))

  useEffect(() => {
    setAddressDraft(serverAddress)
  }, [serverAddress])

  useEffect(() => {
    window.mathDamo?.getLocalIps().then(setLocalIps).catch(() => setLocalIps([]))
  }, [])

  const confirm = () => {
    if (!canConfirm || !dialogMode || !connected) return

    if (dialogMode === 'create') {
      onCreateRoom(trimmedName)
    } else {
      onJoinRoom(trimmedName, normalizedCode)
    }

    setDialogMode(null)
  }

  return (
    <section className="math-quest math-quest--center">
      <div className="math-quest-online__start">
        <span className="math-quest__eyebrow">{connected ? '联机服务器已连接' : '联机服务器未连接'}</span>
        <Typography.Title>趣味数学闯关</Typography.Title>
        <Typography.Paragraph>当前连接：{socketUrl}</Typography.Paragraph>

        <div className="math-quest-online__server">
          <label>
            <span>服务器地址</span>
            <Input
              placeholder="例如 192.168.1.8 或 192.168.1.8:12478"
              value={addressDraft}
              onChange={(event) => setAddressDraft(event.target.value)}
              onPressEnter={() => onServerAddressChange(addressDraft)}
            />
          </label>
          <Button type="primary" onClick={() => onServerAddressChange(addressDraft)}>
            连接
          </Button>
        </div>

        <div className="math-quest-online__help">
          <strong>联机帮助</strong>
          <p>先选一台电脑作为服务器，打开这个软件后不用额外操作，它会自动开服务器。</p>
          <p>其他同一个局域网里的电脑，在这里输入服务器电脑的 IP，再连接同一个服务器。</p>
          <p>大家都连到同一个服务器后，一个人创建房间，其他人输入五位房间号加入。</p>
          <p>不写端口时会默认使用 12478，也可以写成 192.168.1.8:12478。</p>
        </div>

        {localIps.length > 0 && (
          <div className="math-quest-online__ips">
            <strong>这台电脑的 IP</strong>
            <div>
              {localIps.map((ip) => (
                <button key={ip} type="button" onClick={() => setAddressDraft(ip)}>
                  {ip}
                </button>
              ))}
            </div>
          </div>
        )}

        <Space wrap size="large">
          <Button type="primary" size="large" disabled={!connected} onClick={() => setDialogMode('join')}>
            加入房间
          </Button>
          <Button size="large" disabled={!connected} onClick={() => setDialogMode('create')}>
            创建房间
          </Button>
          <Button size="large" onClick={onSinglePlayer}>
            单人练习
          </Button>
          <Button size="large" onClick={onBackHome}>
            返回主页
          </Button>
        </Space>
        {error && <div className="math-quest-online__error">{error}</div>}
      </div>

      <Modal
        open={Boolean(dialogMode)}
        title={dialogMode === 'create' ? '创建房间' : '加入房间'}
        okText={dialogMode === 'create' ? '创建' : '加入'}
        cancelText="取消"
        okButtonProps={{ disabled: !canConfirm || !connected }}
        onCancel={() => setDialogMode(null)}
        onOk={confirm}
      >
        <div className="math-quest-online__form">
          <label>
            <span>玩家名字</span>
            <Input
              maxLength={16}
              placeholder="输入你的名字"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {dialogMode === 'join' && (
            <label>
              <span>五位房间号</span>
              <Input
                inputMode="numeric"
                maxLength={5}
                placeholder="例如 38261"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, ''))}
              />
            </label>
          )}
        </div>
      </Modal>
    </section>
  )
}
