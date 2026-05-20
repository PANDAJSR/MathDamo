import { Button, Input, Modal, Space, Typography } from 'antd'
import { useState } from 'react'
import './MathQuestMultiplayer.css'

type MathQuestOnlineStartProps = {
  error: string
  socketUrl: string
  onCreateRoom: (name: string) => void
  onJoinRoom: (name: string, code: string) => void
  onSinglePlayer: () => void
}

type DialogMode = 'create' | 'join' | null

export function MathQuestOnlineStart({
  error,
  socketUrl,
  onCreateRoom,
  onJoinRoom,
  onSinglePlayer,
}: MathQuestOnlineStartProps) {
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const trimmedName = name.trim()
  const normalizedCode = roomCode.trim()
  const canConfirm = trimmedName.length > 0 && (dialogMode === 'create' || /^\d{5}$/.test(normalizedCode))

  const confirm = () => {
    if (!canConfirm || !dialogMode) return

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
        <span className="math-quest__eyebrow">联机服务器已连接</span>
        <Typography.Title>趣味数学闯关</Typography.Title>
        <Typography.Paragraph>{socketUrl}</Typography.Paragraph>
        <Space wrap size="large">
          <Button type="primary" size="large" onClick={() => setDialogMode('join')}>
            加入房间
          </Button>
          <Button size="large" onClick={() => setDialogMode('create')}>
            创建房间
          </Button>
          <Button size="large" onClick={onSinglePlayer}>
            单人练习
          </Button>
        </Space>
        {error && <div className="math-quest-online__error">{error}</div>}
      </div>

      <Modal
        open={Boolean(dialogMode)}
        title={dialogMode === 'create' ? '创建房间' : '加入房间'}
        okText={dialogMode === 'create' ? '创建' : '加入'}
        cancelText="取消"
        okButtonProps={{ disabled: !canConfirm }}
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
