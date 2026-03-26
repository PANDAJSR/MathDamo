import {
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Segmented,
  Space,
  Switch,
  Tabs,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import './LuckyWheel.css'
import { addWheelHistory, loadWheelHistory, removeWheelHistory, type WheelHistoryRecord } from './luckyWheel/history'
import { formatHistoryTime, INITIAL_ITEMS, toWheelItems } from './luckyWheel/presets'
import { createSharedWheelSearch, sanitizeSharedWheelItems, type SharedWheelItem } from './luckyWheel/share'
import { type RotationMode, type SpinMode, useWheelSpin } from './luckyWheel/useWheelSpin'
import { WheelBoard } from './luckyWheel/WheelBoard'
import { buildWheelSegments, clampWeight, type WheelItem } from './luckyWheel/wheelMath'

const DEFAULT_SPIN_DURATION_SECONDS = 4.2
const MIN_SPIN_DURATION_SECONDS = 1
const MAX_SPIN_DURATION_SECONDS = 20
const MIN_WEIGHT = 0.1
const DEFAULT_LABEL_RADIUS_PERCENT = 32
const LABEL_INSET_PERCENT = 2

type LuckyWheelProps = {
  initialItems?: SharedWheelItem[]
  lockedByShare?: boolean
}

type EditorTabKey = 'create' | 'history'

export function LuckyWheel({ initialItems, lockedByShare = false }: LuckyWheelProps) {
  const wheelBoardRef = useRef<HTMLDivElement | null>(null)
  const spinButtonRef = useRef<HTMLButtonElement | null>(null)

  const resolvedInitialItems = useMemo(
    () => sanitizeSharedWheelItems(initialItems) ?? INITIAL_ITEMS,
    [initialItems],
  )

  const [items, setItems] = useState<WheelItem[]>(() => toWheelItems(resolvedInitialItems))
  const [spinDurationSeconds, setSpinDurationSeconds] = useState(DEFAULT_SPIN_DURATION_SECONDS)
  const [labelRadiusPercent, setLabelRadiusPercent] = useState(DEFAULT_LABEL_RADIUS_PERCENT)
  const [activeTab, setActiveTab] = useState<EditorTabKey>('create')
  const [wheelName, setWheelName] = useState('我的转盘')
  const [showPointerAngle, setShowPointerAngle] = useState(false)
  const [showBoardAngle, setShowBoardAngle] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<WheelHistoryRecord[]>(() => (lockedByShare ? [] : loadWheelHistory()))

  const segments = useMemo(() => buildWheelSegments(items), [items])

  useEffect(() => {
    const board = wheelBoardRef.current
    const button = spinButtonRef.current
    if (!board || !button) return

    const updateLabelRadius = () => {
      const boardRect = board.getBoundingClientRect()
      const buttonRect = button.getBoundingClientRect()
      const boardSize = Math.min(boardRect.width, boardRect.height)
      if (boardSize <= 0) return

      const innerRadiusPercent = (buttonRect.width / boardSize) * 50
      const annulusMiddlePercent = (innerRadiusPercent + 50) / 2
      const nextRadius = Math.max(14, Math.min(44, annulusMiddlePercent - LABEL_INSET_PERCENT))
      setLabelRadiusPercent(nextRadius)
    }

    const observer = new ResizeObserver(updateLabelRadius)
    observer.observe(board)
    observer.observe(button)
    updateLabelRadius()

    return () => observer.disconnect()
  }, [])

  const conicColors = useMemo(() => {
    if (items.length === 0) return 'transparent'

    return items
      .map((item, index) => {
        const segment = segments[index]
        if (!segment) return `${item.color} 0deg 0deg`
        return `${item.color} ${segment.start}deg ${segment.end}deg`
      })
      .join(', ')
  }, [items, segments])

  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + clampWeight(item.weight), 0),
    [items],
  )
  const spinDurationMs = Math.round(spinDurationSeconds * 1000)

  const {
    wheelRotation,
    pointerRotation,
    selectedId,
    spinMode,
    rotationMode,
    spinButtonLabel,
    spinButtonDisabled,
    shouldAnimateRotation,
    transitionTimingFunction,
    setSpinMode,
    setRotationMode,
    onSpinButtonClick,
    resetWheelBoardState,
  } = useWheelSpin({
    items,
    segments,
    spinDurationMs,
  })

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])
  const displayPointerAngle = ((pointerRotation % 360) + 360) % 360
  const displayBoardAngle = (((rotationMode === 'pointer' ? pointerRotation : wheelRotation) % 360) + 360) % 360
  const spinModeOptions: Array<{ label: string; value: SpinMode }> = [{ label: '自动停止', value: 'auto' }, { label: '手动点击停止', value: 'manual' }]
  const rotationModeOptions: Array<{ label: string; value: RotationMode }> = [{ label: '指针固定，转盘旋转', value: 'wheel' }, { label: '转盘固定，指针旋转', value: 'pointer' }]
  const wheelBoardProps = {
    items,
    segments,
    conicColors,
    wheelRotation,
    pointerRotation,
    rotationMode,
    shouldAnimateRotation,
    selectedItem,
    labelRadiusPercent,
    spinDurationMs,
    spinTimingFunction: transitionTimingFunction,
    spinButtonLabel,
    spinButtonDisabled,
    showPointerAngle: rotationMode === 'pointer' && showPointerAngle,
    pointerAngle: displayPointerAngle,
    showBoardAngle,
    boardAngle: displayBoardAngle,
    wheelBoardRef,
    spinButtonRef,
    onSpinButtonClick,
  }

  const handleAddItem = () => {
    const nextId = items.length === 0 ? 1 : Math.max(...items.map((item) => item.id)) + 1
    setItems((prev) => [
      ...prev,
      { id: nextId, label: `选项${prev.length + 1}`, color: '#9dd7ff', weight: 1 },
    ])
  }

  const handleDeleteItem = (id: number) => {
    if (items.length <= 2) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleUpdateItem = (id: number, patch: Partial<WheelItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const handleCopyShareLink = async () => {
    const search = createSharedWheelSearch(items)
    const nextUrl = `${window.location.origin}${window.location.pathname}?${search}`

    if (!navigator.clipboard?.writeText) {
      window.prompt('请手动复制链接：', nextUrl)
      return
    }

    try {
      await navigator.clipboard.writeText(nextUrl)
      message.success('已复制分享链接，打开后会锁定为全屏转盘模式')
    } catch {
      window.prompt('复制失败，请手动复制链接：', nextUrl)
    }
  }

  const handleCreateNewWheel = () => {
    setItems(toWheelItems(INITIAL_ITEMS))
    setWheelName('我的新转盘')
    resetWheelBoardState()
    setActiveTab('create')
  }

  const handleRotationModeChange = (nextMode: RotationMode) => {
    setRotationMode(nextMode)
    if (nextMode !== 'pointer') setShowPointerAngle(false)
    resetWheelBoardState()
  }

  const handleSaveToHistory = () => {
    if (items.length < 2) {
      message.warning('至少需要 2 个选项才能保存')
      return
    }

    const nextRecords = addWheelHistory(wheelName, items)
    setHistoryRecords(nextRecords)
    message.success('已保存到本地历史')
  }

  const handleLoadFromHistory = (record: WheelHistoryRecord) => {
    setItems(toWheelItems(record.items))
    setWheelName(record.name)
    resetWheelBoardState()
    setActiveTab('create')
    message.success('已加载历史转盘')
  }

  const handleDeleteHistory = (recordId: string) => {
    const nextRecords = removeWheelHistory(recordId)
    setHistoryRecords(nextRecords)
    message.success('已删除历史转盘')
  }

  if (lockedByShare) {
    return (
      <section className="lucky-wheel lucky-wheel--locked">
        <WheelBoard {...wheelBoardProps} />
      </section>
    )
  }

  return (
    <section className="lucky-wheel">
      <Typography.Title level={3}>转盘</Typography.Title>
      <Typography.Paragraph>
        可添加/删除格子，自定义文字、颜色和权重。权重越高，扇区越大且被抽中的概率越高。
      </Typography.Paragraph>

      <Tabs
        className="wheel-tabs"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as EditorTabKey)}
        items={[
          {
            key: 'create',
            label: '新建转盘',
            children: (
              <>
                <WheelBoard {...wheelBoardProps} />
                <div className="wheel-editor">
                  <div className="wheel-editor-header">
                    <Typography.Title level={4}>选项配置</Typography.Title>
                    <Space wrap>
                      <Typography.Text type="secondary">权重总和：{totalWeight.toFixed(1)}</Typography.Text>
                      <Button onClick={handleCopyShareLink}>复制分享链接</Button>
                      <Button onClick={handleSaveToHistory}>保存到历史</Button>
                      <Button onClick={handleCreateNewWheel}>创建新的转盘</Button>
                      <Button onClick={handleAddItem}>添加格子</Button>
                    </Space>
                  </div>
                  <div className="wheel-name-row">
                    <Typography.Text type="secondary">转盘名称</Typography.Text>
                    <Input
                      value={wheelName}
                      maxLength={30}
                      placeholder="给这个转盘起个名字"
                      onChange={(event) => setWheelName(event.target.value)}
                    />
                  </div>
                  <div className="wheel-name-row">
                    <Typography.Text type="secondary">旋转时长</Typography.Text>
                    <InputNumber
                      min={MIN_SPIN_DURATION_SECONDS}
                      max={MAX_SPIN_DURATION_SECONDS}
                      step={0.1}
                      value={spinDurationSeconds}
                      addonAfter="秒"
                      onChange={(value) =>
                        setSpinDurationSeconds(
                          Math.max(
                            MIN_SPIN_DURATION_SECONDS,
                            Math.min(MAX_SPIN_DURATION_SECONDS, Number(value) || DEFAULT_SPIN_DURATION_SECONDS),
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="wheel-name-row">
                    <Typography.Text type="secondary">旋转模式</Typography.Text>
                    <Segmented
                      block
                      options={rotationModeOptions}
                      value={rotationMode}
                      onChange={(value) => handleRotationModeChange(value as RotationMode)}
                    />
                  </div>
                  <div className="wheel-name-row">
                    <Typography.Text type="secondary">显示区块角度</Typography.Text>
                    <Switch checked={showBoardAngle} onChange={setShowBoardAngle} checkedChildren="开" unCheckedChildren="关" />
                  </div>
                  {rotationMode === 'pointer' ? (
                    <div className="wheel-name-row">
                      <Typography.Text type="secondary">显示指针角度</Typography.Text>
                      <Switch checked={showPointerAngle} onChange={setShowPointerAngle} checkedChildren="开" unCheckedChildren="关" />
                    </div>
                  ) : null}
                  <div className="wheel-name-row">
                    <Typography.Text type="secondary">停止方式</Typography.Text>
                    <Segmented
                      block
                      options={spinModeOptions}
                      value={spinMode}
                      onChange={(value) => setSpinMode(value as SpinMode)}
                    />
                  </div>
                  {items.map((item) => (
                    <div className="wheel-item-row" key={item.id}>
                      <Input
                        className="wheel-item-name"
                        value={item.label}
                        maxLength={20}
                        placeholder="输入文字"
                        onChange={(event) => handleUpdateItem(item.id, { label: event.target.value })}
                      />
                      <input
                        className="wheel-color-input"
                        type="color"
                        value={item.color}
                        aria-label="选择颜色"
                        onChange={(event) => handleUpdateItem(item.id, { color: event.target.value })}
                      />
                      <InputNumber
                        className="wheel-item-weight"
                        min={MIN_WEIGHT}
                        step={0.1}
                        value={item.weight}
                        addonBefore="权重"
                        onChange={(value) => handleUpdateItem(item.id, { weight: clampWeight(value) })}
                      />
                      <Button danger disabled={items.length <= 2} onClick={() => handleDeleteItem(item.id)}>
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ),
          },
          {
            key: 'history',
            label: `历史转盘 (${historyRecords.length})`,
            children:
              historyRecords.length === 0 ? (
                <div className="wheel-history-empty">
                  <Empty description="暂无历史转盘，先在“新建转盘”里保存一个吧" />
                </div>
              ) : (
                <div className="wheel-history-list">
                  {historyRecords.map((record) => (
                    <div className="wheel-history-card" key={record.id}>
                      <div className="wheel-history-info">
                        <Typography.Title level={5}>{record.name}</Typography.Title>
                        <Typography.Text type="secondary">
                          创建时间：{formatHistoryTime(record.createdAt)}
                        </Typography.Text>
                        <Typography.Paragraph ellipsis={{ rows: 2 }}>
                          选项：{record.items.map((item) => item.label).join('、')}
                        </Typography.Paragraph>
                      </div>
                      <Space>
                        <Button type="primary" onClick={() => handleLoadFromHistory(record)}>
                          使用这个转盘
                        </Button>
                        <Popconfirm
                          title="删除这个历史转盘？"
                          okText="删除"
                          cancelText="取消"
                          onConfirm={() => handleDeleteHistory(record.id)}
                        >
                          <Button danger>删除</Button>
                        </Popconfirm>
                      </Space>
                    </div>
                  ))}
                </div>
              ),
          },
        ]}
      />
    </section>
  )
}
