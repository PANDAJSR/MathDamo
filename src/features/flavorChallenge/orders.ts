export type IngredientKey = 'juice' | 'water' | 'sugar'

export type OrderKind = 'ratio' | 'percent'

export type Order = {
  id: number
  customer: string
  title: string
  request: string
  kind: OrderKind
  totalMl: number
  primary: IngredientKey
  secondary: IngredientKey
  ratio?: [number, number]
  percent?: number
}

export type MixAmounts = Record<IngredientKey, number>

export const ingredientMeta: Record<IngredientKey, { label: string; color: string }> = {
  juice: { label: '果汁', color: '#f97316' },
  water: { label: '水', color: '#38bdf8' },
  sugar: { label: '糖浆', color: '#eab308' },
}

const customers = [
  '赶时间的篮球队长',
  '爱喝淡味的程序员',
  '挑剔的美食博主',
  '数学社新人',
  '戴墨镜的滑板少年',
  '准备考试的学霸',
  '刚下课的小学生',
  '健身教练',
  '夜跑社社长',
  '急着赶飞机的游客',
  '生日派对主持人',
  '放学路上的双胞胎',
]

const ratioTitles = [
  '橙汁水波',
  '热带黄金比',
  '蓝莓补水杯',
  '橙色火箭杯',
  '星光补给杯',
  '机场特调杯',
]

const percentTitles = [
  '苹果轻甜杯',
  '清爽蜜桃杯',
  '醒脑柠檬饮',
  '低糖活力杯',
  '微甜苹果杯',
  '派对甜心杯',
]

const ratioPairs: Array<[number, number]> = [
  [1, 2],
  [2, 3],
  [3, 5],
  [4, 5],
  [5, 7],
  [7, 3],
  [4, 1],
  [9, 6],
]

const percents = [5, 6, 8, 10, 12, 15, 18, 20, 25]
const ratioUnits = [20, 25, 30, 40, 50]
const percentTotals = [200, 250, 300, 350, 400, 450, 500, 600]

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

export function createRandomOrder(): Order {
  const kind: OrderKind = Math.random() > 0.45 ? 'ratio' : 'percent'
  const customer = pickRandom(customers)

  if (kind === 'ratio') {
    const ratio = pickRandom(ratioPairs)
    const unit = pickRandom(ratioUnits)
    const totalMl = (ratio[0] + ratio[1]) * unit
    const title = pickRandom(ratioTitles)

    return {
      id: Date.now() + Math.floor(Math.random() * 10000),
      customer,
      title,
      request: `果汁与水的比是 ${ratio[0]}:${ratio[1]}，总容量 ${totalMl}ml。`,
      kind,
      totalMl,
      primary: 'juice',
      secondary: 'water',
      ratio,
    }
  }

  const percent = pickRandom(percents)
  const totalMl = pickRandom(percentTotals)
  const title = pickRandom(percentTitles)

  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    customer,
    title,
    request: `我要一杯含糖量 ${percent}% 的果汁，总容量 ${totalMl}ml。`,
    kind,
    totalMl,
    primary: 'sugar',
    secondary: 'juice',
    percent,
  }
}

export const emptyMix: MixAmounts = {
  juice: 0,
  water: 0,
  sugar: 0,
}

export function getExpectedAmounts(order: Order): MixAmounts {
  const expected = { ...emptyMix }

  if (order.kind === 'ratio' && order.ratio) {
    const [primaryPart, secondaryPart] = order.ratio
    const unit = order.totalMl / (primaryPart + secondaryPart)
    expected[order.primary] = primaryPart * unit
    expected[order.secondary] = secondaryPart * unit
    return expected
  }

  const primaryAmount = order.totalMl * ((order.percent ?? 0) / 100)
  expected[order.primary] = primaryAmount
  expected[order.secondary] = order.totalMl - primaryAmount
  return expected
}

export function getActiveIngredients(order: Order) {
  return [order.primary, order.secondary]
}

export function getOrderFormula(order: Order) {
  if (order.kind === 'ratio' && order.ratio) {
    const [primaryPart, secondaryPart] = order.ratio
    const unit = order.totalMl / (primaryPart + secondaryPart)
    return `每份 ${unit.toFixed(1)}ml，${ingredientMeta[order.primary].label} ${primaryPart} 份，${ingredientMeta[order.secondary].label} ${secondaryPart} 份`
  }

  const percent = order.percent ?? 0
  return `${ingredientMeta[order.primary].label} = ${order.totalMl} × ${percent}%`
}
