const PI_VALUE = 3.14

export type ClueKind = 'diameter' | 'radius' | 'area' | 'circumference'

export type Clue = {
  kind: ClueKind
  name: string
  symbol: string
  value: number
}

export type Ring = {
  clue: Clue
  circumference: number
}

export type Wave = {
  clue: Clue
  diameter: number
  targetCircumference: number
  rings: Ring[]
}

const roundTwo = (value: number) => Math.round(value * 100) / 100

export const formatGameNumber = (value: number) => (
  Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/\.?0+$/, '')
)

const shuffle = <T,>(items: T[]) => {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

const createClue = (levelBias: number): Clue => {
  const maxRadius = Math.min(12, 4 + levelBias)
  const radius = 2 + Math.floor(Math.random() * (maxRadius - 1))
  return createClueFromRadius(radius, shuffle<ClueKind>(['diameter', 'radius', 'area'])[0])
}

const createClueFromRadius = (radius: number, kind: ClueKind): Clue => {
  if (kind === 'diameter') {
    return {
      kind,
      name: '直径',
      symbol: 'd',
      value: roundTwo(radius * 2),
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

  if (kind === 'area') {
    return {
      kind,
      name: '面积',
      symbol: 'S',
      value: roundTwo(PI_VALUE * radius * radius),
    }
  }

  return {
    kind,
    name: '周长',
    symbol: 'C',
    value: roundTwo(2 * PI_VALUE * radius),
  }
}

const getCircumferenceFromClue = (clue: Clue) => {
  if (clue.kind === 'diameter') return roundTwo(clue.value * PI_VALUE)
  if (clue.kind === 'radius') return roundTwo(clue.value * 2 * PI_VALUE)
  if (clue.kind === 'circumference') return clue.value
  return roundTwo(2 * Math.sqrt(clue.value * PI_VALUE))
}

const getDiameterFromClue = (clue: Clue) => {
  if (clue.kind === 'diameter') return clue.value
  if (clue.kind === 'radius') return roundTwo(clue.value * 2)
  if (clue.kind === 'circumference') return roundTwo(clue.value / PI_VALUE)
  return roundTwo(2 * Math.sqrt(clue.value / PI_VALUE))
}

export const getFormulaText = (clue: Clue) => {
  if (clue.kind === 'diameter') return `${formatGameNumber(clue.value)} x 3.14`
  if (clue.kind === 'radius') return `2 x ${formatGameNumber(clue.value)} x 3.14`
  if (clue.kind === 'circumference') return formatGameNumber(clue.value)
  return `2 x √(${formatGameNumber(clue.value)} x 3.14)`
}

const createRing = (circumference: number, kind: ClueKind): Ring => {
  const radius = circumference / (2 * PI_VALUE)
  const clue = createClueFromRadius(radius, kind)

  return {
    clue,
    circumference: getCircumferenceFromClue(clue),
  }
}

const createWrongLabelRing = (targetCircumference: number, sourceKind: ClueKind): Ring => {
  const labelKinds: ClueKind[] = sourceKind === 'diameter'
    ? ['radius']
    : sourceKind === 'radius'
      ? ['diameter']
      : ['diameter', 'radius']
  const kind = shuffle(labelKinds)[0]
  const clue: Clue = {
    kind,
    name: kind === 'diameter' ? '直径' : '半径',
    symbol: kind === 'diameter' ? 'd' : 'r',
    value: targetCircumference,
  }

  return {
    clue,
    circumference: getCircumferenceFromClue(clue),
  }
}

const createNeighborCircumferenceRing = (targetCircumference: number): Ring => {
  const step = shuffle([-PI_VALUE, PI_VALUE, -2 * PI_VALUE, 2 * PI_VALUE]).find((offset) => (
    targetCircumference + offset > 0
  )) ?? PI_VALUE

  return createRing(roundTwo(targetCircumference + step), 'circumference')
}

export const createWave = (score: number): Wave => {
  const levelBias = Math.min(8, Math.floor(score / 80))
  const clue = createClue(levelBias)
  const diameter = getDiameterFromClue(clue)
  const targetCircumference = getCircumferenceFromClue(clue)
  const rings = shuffle([
    createRing(targetCircumference, 'circumference'),
    createWrongLabelRing(targetCircumference, clue.kind),
    createNeighborCircumferenceRing(targetCircumference),
  ])

  return { clue, diameter, targetCircumference, rings }
}

export const getLevel = (score: number) => Math.floor(score / 50) + 1

export const getSpeed = () => 14
