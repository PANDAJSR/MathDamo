import { sanitizeSharedWheelItems, type SharedWheelItem } from './share'

export type WheelHistoryRecord = {
  id: string
  name: string
  createdAt: string
  items: SharedWheelItem[]
}

const STORAGE_KEY = 'mathdamo:lucky-wheel-history:v1'
const MAX_HISTORY_SIZE = 30

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeHistoryRecord(raw: unknown): WheelHistoryRecord | null {
  if (!isRecord(raw)) return null

  const id = typeof raw.id === 'string' ? raw.id : ''
  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim().slice(0, 30)
      : '未命名转盘'
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : ''
  const items = sanitizeSharedWheelItems(raw.items)

  if (!id || !createdAt || !items) return null
  return { id, name, createdAt, items }
}

function saveRecords(records: WheelHistoryRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function loadWheelHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((record) => sanitizeHistoryRecord(record))
      .filter((record): record is WheelHistoryRecord => record !== null)
      .slice(0, MAX_HISTORY_SIZE)
  } catch {
    return []
  }
}

export function addWheelHistory(name: string, items: SharedWheelItem[]) {
  const nextRecord: WheelHistoryRecord = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 30) || '未命名转盘',
    createdAt: new Date().toISOString(),
    items,
  }
  const nextRecords = [nextRecord, ...loadWheelHistory()].slice(0, MAX_HISTORY_SIZE)
  saveRecords(nextRecords)
  return nextRecords
}

export function removeWheelHistory(recordId: string) {
  const nextRecords = loadWheelHistory().filter((record) => record.id !== recordId)
  saveRecords(nextRecords)
  return nextRecords
}
