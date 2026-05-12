export type IngredientKey = 'juice' | 'water' | 'sugar'

export type OrderKind = 'ratio' | 'percent' | 'fraction'

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
  fraction?: [number, number]
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

const fractionTitles = [
  '半杯阳光',
  '三分甜云朵',
  '莓果分数杯',
  '柚子切分饮',
  '课堂练习杯',
  '午后平衡杯',
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
const fractions: Array<[number, number]> = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [1, 5],
  [2, 5],
  [3, 5],
]
const fractionUnits = [50, 60, 80, 100, 120]

const percentTargets: Array<{ primary: IngredientKey; secondary: IngredientKey }> = [
  { primary: 'sugar', secondary: 'juice' },
  { primary: 'juice', secondary: 'water' },
]

const fractionTargets: Array<{ primary: IngredientKey; secondary: IngredientKey }> = [
  { primary: 'sugar', secondary: 'juice' },
  { primary: 'juice', secondary: 'water' },
]

const orderKinds: OrderKind[] = ['ratio', 'percent', 'fraction']

const ratioRequestTemplates = [
  (ratio: [number, number], totalMl: number) =>
    `果汁与水的比是 ${ratio[0]}:${ratio[1]}，总容量 ${totalMl}ml。`,
  (ratio: [number, number], totalMl: number) =>
    `每 ${ratio[0]} 份果汁配 ${ratio[1]} 份水，最后要 ${totalMl}ml。`,
  (ratio: [number, number], totalMl: number) =>
    `把整杯分成 ${ratio[0] + ratio[1]} 份，其中 ${ratio[0]} 份果汁、${ratio[1]} 份水，共 ${totalMl}ml。`,
  (ratio: [number, number], totalMl: number) =>
    `我想要果汁:水 = ${ratio[0]}:${ratio[1]}，请调到 ${totalMl}ml。`,
]

const percentRequestTemplates = [
  (label: string, percent: number, totalMl: number) =>
    `${label}占整杯 ${percent}%，总容量 ${totalMl}ml。`,
  (label: string, percent: number, totalMl: number) =>
    `整杯做 ${totalMl}ml，其中 ${percent}% 必须是${label}。`,
  (label: string, percent: number, totalMl: number) =>
    `请把${label}控制在 ${percent}% ，剩下补满到 ${totalMl}ml。`,
  (label: string, percent: number, totalMl: number) =>
    `我想要 ${totalMl}ml，${label}浓度刚好 ${percent}%。`,
]

const fractionRequestTemplates = [
  (label: string, fraction: [number, number], totalMl: number) =>
    `${label}占整杯的 ${fraction[0]}/${fraction[1]}，总容量 ${totalMl}ml。`,
  (label: string, fraction: [number, number], totalMl: number) =>
    `把 ${totalMl}ml 平均分成 ${fraction[1]} 份，其中 ${fraction[0]} 份放${label}。`,
  (label: string, fraction: [number, number], totalMl: number) =>
    `我只要 ${fraction[0]}/${fraction[1]} 杯是${label}，整杯做 ${totalMl}ml。`,
  (label: string, fraction: [number, number], totalMl: number) =>
    `这杯 ${totalMl}ml 的饮料里，${label}要占 ${fraction[0]}/${fraction[1]}。`,
]

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

export function createRandomOrder(): Order {
  const kind = pickRandom(orderKinds)
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
      request: pickRandom(ratioRequestTemplates)(ratio, totalMl),
      kind,
      totalMl,
      primary: 'juice',
      secondary: 'water',
      ratio,
    }
  }

  if (kind === 'percent') {
    const percent = pickRandom(percents)
    const totalMl = pickRandom(percentTotals)
    const title = pickRandom(percentTitles)
    const target = pickRandom(percentTargets)
    const label = ingredientMeta[target.primary].label

    return {
      id: Date.now() + Math.floor(Math.random() * 10000),
      customer,
      title,
      request: pickRandom(percentRequestTemplates)(label, percent, totalMl),
      kind,
      totalMl,
      primary: target.primary,
      secondary: target.secondary,
      percent,
    }
  }

  const fraction = pickRandom(fractions)
  const unit = pickRandom(fractionUnits)
  const totalMl = fraction[1] * unit
  const title = pickRandom(fractionTitles)
  const target = pickRandom(fractionTargets)
  const label = ingredientMeta[target.primary].label

  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    customer,
    title,
    request: pickRandom(fractionRequestTemplates)(label, fraction, totalMl),
    kind,
    totalMl,
    primary: target.primary,
    secondary: target.secondary,
    fraction,
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

  if (order.kind === 'fraction' && order.fraction) {
    const [numerator, denominator] = order.fraction
    const primaryAmount = order.totalMl * (numerator / denominator)
    expected[order.primary] = primaryAmount
    expected[order.secondary] = order.totalMl - primaryAmount
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

  if (order.kind === 'fraction' && order.fraction) {
    const [numerator, denominator] = order.fraction
    return `${ingredientMeta[order.primary].label} = ${order.totalMl} × ${numerator}/${denominator}`
  }

  const percent = order.percent ?? 0
  return `${ingredientMeta[order.primary].label} = ${order.totalMl} × ${percent}%`
}
