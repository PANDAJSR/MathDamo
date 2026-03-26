import { clampWeight, type WheelItem } from './wheelMath'

export const INITIAL_ITEMS: WheelItem[] = [
  { id: 1, label: '特等奖', color: '#f38aa8', weight: 1 },
  { id: 2, label: '一等奖', color: '#f08b8d', weight: 1 },
  { id: 3, label: '二等奖', color: '#f4d96d', weight: 1 },
  { id: 4, label: '三等奖', color: '#9be4b0', weight: 1 },
  { id: 5, label: '四等奖', color: '#93ddff', weight: 1 },
  { id: 6, label: '参与奖', color: '#b49cf4', weight: 1 },
]

export function toWheelItems(rawItems: Array<{ label: string; color: string; weight: number }>) {
  return rawItems.map((item, index) => ({
    id: index + 1,
    label: item.label,
    color: item.color,
    weight: clampWeight(item.weight),
  }))
}

export function formatHistoryTime(isoText: string) {
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) return isoText
  return date.toLocaleString('zh-CN', { hour12: false })
}
