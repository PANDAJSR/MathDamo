export type SharedWheelItem = {
  id: number
  label: string
  color: string
  weight: number
}

export type SharedWheelConfig = {
  items: SharedWheelItem[]
}

type UnknownRecord = Record<string, unknown>

const MIN_ITEMS = 2
const MAX_ITEMS = 40
const MIN_WEIGHT = 0.1

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function clampWeight(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) return MIN_WEIGHT
  return Math.max(MIN_WEIGHT, value)
}

function sanitizeColor(value: unknown) {
  if (typeof value !== 'string') return '#9dd7ff'
  const next = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(next) ? next : '#9dd7ff'
}

function sanitizeLabel(value: unknown, fallbackIndex: number) {
  if (typeof value !== 'string') return `选项${fallbackIndex + 1}`
  const next = value.trim()
  if (!next) return `选项${fallbackIndex + 1}`
  return next.slice(0, 20)
}

export function sanitizeSharedWheelItems(rawItems: unknown): SharedWheelItem[] | null {
  if (!Array.isArray(rawItems)) return null

  const boundedItems = rawItems.slice(0, MAX_ITEMS)
  const sanitized = boundedItems
    .map((rawItem, index) => {
      if (!isRecord(rawItem)) return null
      return {
        id: index + 1,
        label: sanitizeLabel(rawItem.label, index),
        color: sanitizeColor(rawItem.color),
        weight: clampWeight(rawItem.weight),
      }
    })
    .filter((item): item is SharedWheelItem => item !== null)

  if (sanitized.length < MIN_ITEMS) return null
  return sanitized
}

export function createSharedWheelSearch(items: SharedWheelItem[]) {
  const params = new URLSearchParams(window.location.search)
  params.set('wheel', JSON.stringify({ items }))
  return params.toString()
}

export function parseSharedWheelConfigFromSearch(search: string): SharedWheelConfig | null {
  const params = new URLSearchParams(search)
  const rawConfig = params.get('wheel')
  if (!rawConfig) return null

  try {
    const parsed = JSON.parse(rawConfig) as unknown
    if (!isRecord(parsed)) return null
    const items = sanitizeSharedWheelItems(parsed.items)
    if (!items) return null
    return { items }
  } catch {
    return null
  }
}
