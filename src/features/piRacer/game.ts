const PI_VALUE = 3.14

export type ClueKind = 'diameter' | 'radius' | 'area'

export type Clue = {
  kind: ClueKind
  name: string
  symbol: string
  value: number
}

export type Ring = {
  circumference: number
}

export type Wave = {
  clue: Clue
  diameter: number
  targetCircumference: number
  rings: Ring[]
}

const roundOne = (value: number) => Math.round(value * 10) / 10

const shuffle = <T,>(items: T[]) => {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

const createClue = (levelBias: number): Clue => {
  const kind = shuffle<ClueKind>(['diameter', 'radius', 'area'])[0]
  const radius = roundOne(6 + Math.random() * 11 + levelBias * 0.35)

  if (kind === 'diameter') {
    return {
      kind,
      name: '直径',
      symbol: 'd',
      value: roundOne(radius * 2),
    }
  }

  if (kind === 'radius') {
    return {
      kind,
      name: '半径',
      symbol: 'r',
      value: radius,
    }
  }

  return {
    kind,
    name: '面积',
    symbol: 'A',
    value: roundOne(PI_VALUE * radius * radius),
  }
}

const getCircumferenceFromClue = (clue: Clue) => {
  if (clue.kind === 'diameter') return roundOne(clue.value * PI_VALUE)
  if (clue.kind === 'radius') return roundOne(clue.value * 2 * PI_VALUE)
  return roundOne(2 * Math.sqrt(clue.value * PI_VALUE))
}

const getDiameterFromClue = (clue: Clue) => {
  if (clue.kind === 'diameter') return clue.value
  if (clue.kind === 'radius') return roundOne(clue.value * 2)
  return roundOne(2 * Math.sqrt(clue.value / PI_VALUE))
}

export const getFormulaText = (clue: Clue) => {
  if (clue.kind === 'diameter') return `${clue.value.toFixed(1)} x 3.14`
  if (clue.kind === 'radius') return `2 x ${clue.value.toFixed(1)} x 3.14`
  return `2 x √(${clue.value.toFixed(1)} x 3.14)`
}

export const createWave = (score: number): Wave => {
  const levelBias = Math.min(8, Math.floor(score / 80))
  const clue = createClue(levelBias)
  const diameter = getDiameterFromClue(clue)
  const targetCircumference = getCircumferenceFromClue(clue)
  const offsets = shuffle([-0.24, -0.15, 0.16, 0.26]).slice(0, 2)
  const rings = shuffle([
    { circumference: targetCircumference },
    ...offsets.map((offset) => ({
      circumference: roundOne(targetCircumference * (1 + offset)),
    })),
  ])

  return { clue, diameter, targetCircumference, rings }
}

export const getLevel = (score: number) => Math.floor(score / 50) + 1

export const getSpeed = (level: number) => Math.min(46, 17 + level * 3.6)
