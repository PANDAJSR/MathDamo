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

const roundOne = (value: number) => Math.round(value * 10) / 10
const clueKinds: ClueKind[] = ['diameter', 'radius', 'area', 'circumference']

const shuffle = <T,>(items: T[]) => {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

const createClue = (levelBias: number): Clue => {
  const radius = roundOne(6 + Math.random() * 11 + levelBias * 0.35)
  return createClueFromRadius(radius, shuffle<ClueKind>(['diameter', 'radius', 'area'])[0])
}

const createClueFromRadius = (radius: number, kind: ClueKind): Clue => {
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

  if (kind === 'area') {
    return {
      kind,
      name: '面积',
      symbol: 'S',
      value: roundOne(PI_VALUE * radius * radius),
    }
  }

  return {
    kind,
    name: '周长',
    symbol: 'C',
    value: roundOne(2 * PI_VALUE * radius),
  }
}

const getCircumferenceFromClue = (clue: Clue) => {
  if (clue.kind === 'diameter') return roundOne(clue.value * PI_VALUE)
  if (clue.kind === 'radius') return roundOne(clue.value * 2 * PI_VALUE)
  if (clue.kind === 'circumference') return clue.value
  return roundOne(2 * Math.sqrt(clue.value * PI_VALUE))
}

const getDiameterFromClue = (clue: Clue) => {
  if (clue.kind === 'diameter') return clue.value
  if (clue.kind === 'radius') return roundOne(clue.value * 2)
  if (clue.kind === 'circumference') return roundOne(clue.value / PI_VALUE)
  return roundOne(2 * Math.sqrt(clue.value / PI_VALUE))
}

export const getFormulaText = (clue: Clue) => {
  if (clue.kind === 'diameter') return `${clue.value.toFixed(1)} x 3.14`
  if (clue.kind === 'radius') return `2 x ${clue.value.toFixed(1)} x 3.14`
  if (clue.kind === 'circumference') return clue.value.toFixed(1)
  return `2 x √(${clue.value.toFixed(1)} x 3.14)`
}

const createRing = (circumference: number, kind: ClueKind): Ring => {
  const radius = circumference / (2 * PI_VALUE)
  const clue = createClueFromRadius(radius, kind)

  return {
    clue,
    circumference: getCircumferenceFromClue(clue),
  }
}

export const createWave = (score: number): Wave => {
  const levelBias = Math.min(8, Math.floor(score / 80))
  const clue = createClue(levelBias)
  const diameter = getDiameterFromClue(clue)
  const targetCircumference = getCircumferenceFromClue(clue)
  const availableKinds = clueKinds.filter((kind) => kind !== clue.kind)
  const decoyKinds = availableKinds.filter((kind) => kind !== 'circumference')
  const offsets = shuffle([-0.24, -0.15, 0.16, 0.26]).slice(0, decoyKinds.length)
  const rings = shuffle([
    createRing(targetCircumference, 'circumference'),
    ...decoyKinds.map((kind, index) => (
      createRing(roundOne(targetCircumference * (1 + offsets[index])), kind)
    )),
  ])

  return { clue, diameter, targetCircumference, rings }
}

export const getLevel = (score: number) => Math.floor(score / 50) + 1

export const getSpeed = (level: number) => Math.min(46, 17 + level * 3.6)
