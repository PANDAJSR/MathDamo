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

export const orders: Order[] = [
  {
    id: 1,
    customer: '赶时间的篮球队长',
    title: '橙汁水波',
    request: '橙汁与水的比是 3:5，总容量 400ml。',
    kind: 'ratio',
    totalMl: 400,
    primary: 'juice',
    secondary: 'water',
    ratio: [3, 5],
  },
  {
    id: 2,
    customer: '爱喝淡味的程序员',
    title: '苹果轻甜杯',
    request: '我要一杯含糖量 15% 的苹果汁，总容量 300ml。',
    kind: 'percent',
    totalMl: 300,
    primary: 'sugar',
    secondary: 'juice',
    percent: 15,
  },
  {
    id: 3,
    customer: '挑剔的美食博主',
    title: '热带黄金比',
    request: '果汁与水的比是 7:3，总容量 500ml。',
    kind: 'ratio',
    totalMl: 500,
    primary: 'juice',
    secondary: 'water',
    ratio: [7, 3],
  },
  {
    id: 4,
    customer: '数学社新人',
    title: '清爽蜜桃杯',
    request: '糖浆占整杯 8%，总容量 250ml。',
    kind: 'percent',
    totalMl: 250,
    primary: 'sugar',
    secondary: 'juice',
    percent: 8,
  },
  {
    id: 5,
    customer: '戴墨镜的滑板少年',
    title: '蓝莓补水杯',
    request: '果汁与水的比是 2:3，总容量 350ml。',
    kind: 'ratio',
    totalMl: 350,
    primary: 'juice',
    secondary: 'water',
    ratio: [2, 3],
  },
  {
    id: 6,
    customer: '准备考试的学霸',
    title: '醒脑柠檬饮',
    request: '糖浆占整杯 12%，总容量 450ml。',
    kind: 'percent',
    totalMl: 450,
    primary: 'sugar',
    secondary: 'juice',
    percent: 12,
  },
  {
    id: 7,
    customer: '刚下课的小学生',
    title: '橙色火箭杯',
    request: '果汁与水的比是 5:7，总容量 360ml。',
    kind: 'ratio',
    totalMl: 360,
    primary: 'juice',
    secondary: 'water',
    ratio: [5, 7],
  },
  {
    id: 8,
    customer: '健身教练',
    title: '低糖活力杯',
    request: '我要含糖量 6% 的果汁，总容量 500ml。',
    kind: 'percent',
    totalMl: 500,
    primary: 'sugar',
    secondary: 'juice',
    percent: 6,
  },
  {
    id: 9,
    customer: '夜跑社社长',
    title: '星光补给杯',
    request: '果汁与水的比是 4:1，总容量 250ml。',
    kind: 'ratio',
    totalMl: 250,
    primary: 'juice',
    secondary: 'water',
    ratio: [4, 1],
  },
  {
    id: 10,
    customer: '牙医叔叔',
    title: '微甜苹果杯',
    request: '糖浆占整杯 5%，总容量 200ml。',
    kind: 'percent',
    totalMl: 200,
    primary: 'sugar',
    secondary: 'juice',
    percent: 5,
  },
  {
    id: 11,
    customer: '急着赶飞机的游客',
    title: '机场特调杯',
    request: '果汁与水的比是 9:6，总容量 300ml。',
    kind: 'ratio',
    totalMl: 300,
    primary: 'juice',
    secondary: 'water',
    ratio: [9, 6],
  },
  {
    id: 12,
    customer: '生日派对主持人',
    title: '派对甜心杯',
    request: '我要含糖量 18% 的果汁，总容量 400ml。',
    kind: 'percent',
    totalMl: 400,
    primary: 'sugar',
    secondary: 'juice',
    percent: 18,
  },
]

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
