import type { MediaEntry } from '../../hooks/queries/useMediaQueries'

// Sorting reads your shelf rather than asking you questions. What you log and
// how you rate is a real portrait of taste, and a house you were given for a
// reason means more than one you picked off a list.
//
// It only ever proposes. The chosen house always wins — people are attached to
// theirs, and an app has no business overruling that.

export type HouseId = 'gryffindor' | 'ravenclaw' | 'hufflepuff' | 'slytherin'

export type House = {
  id: HouseId
  name: string
  /** Wool, then the stripe running through it. */
  colors: [string, string]
  /** What the house is like, in the app's voice. */
  trait: string
}

export const HOUSES: Record<HouseId, House> = {
  gryffindor: {
    id: 'gryffindor',
    name: 'Gryffindor',
    colors: ['#7b1e26', '#d3a625'],
    trait: 'Rates from the heart, and never from the middle.',
  },
  ravenclaw: {
    id: 'ravenclaw',
    name: 'Ravenclaw',
    colors: ['#222f5b', '#946b2d'],
    trait: 'Reads widely, rates precisely, argues in decimals.',
  },
  hufflepuff: {
    id: 'hufflepuff',
    name: 'Hufflepuff',
    colors: ['#e0a80d', '#372e29'],
    trait: 'Finds something to love in almost everything.',
  },
  slytherin: {
    id: 'slytherin',
    name: 'Slytherin',
    colors: ['#1a472a', '#9fa8a3'],
    trait: 'Holds a high bar, and says so.',
  },
}

export const HOUSE_LIST: House[] = [
  HOUSES.gryffindor,
  HOUSES.ravenclaw,
  HOUSES.hufflepuff,
  HOUSES.slytherin,
]

/** Below this there is not enough shelf to read anything from. */
export const SORTING_MINIMUM = 5

export type Sorting = {
  house: House
  /** Why this house, in one sentence, using their own numbers. */
  because: string
}

export function isHouseId(value: unknown): value is HouseId {
  return typeof value === 'string' && value in HOUSES
}

/**
 * Reads a shelf and proposes a house. Null means the shelf is too thin to say
 * anything honest about, which is better than guessing.
 */
export function sortByShelf(entries: readonly MediaEntry[]): Sorting | null {
  const rated = entries.filter(
    (entry) => !entry.dumpstered && typeof entry.rating === 'number'
  )
  const dumpsters = entries.filter((entry) => entry.dumpstered).length
  if (rated.length + dumpsters < SORTING_MINIMUM) return null

  const ratings = rated.map((entry) => entry.rating as number)
  const average = ratings.reduce((sum, n) => sum + n, 0) / (ratings.length || 1)

  // Bold taste lives at the ends of the scale rather than the middle.
  const extremes =
    ratings.filter((rating) => rating >= 8.5 || rating <= 3).length /
    (ratings.length || 1)
  // Anyone who bothers with a decimal is measuring, not reacting.
  const precise =
    ratings.filter((rating) => Math.round(rating) !== rating).length /
    (ratings.length || 1)
  const bookish =
    entries.filter(
      (entry) => entry.media_type === 'book' || entry.media_type === 'game'
    ).length / (entries.length || 1)
  const harsh = dumpsters / (rated.length + dumpsters || 1)

  const scores: Record<HouseId, number> = {
    ravenclaw: precise * 1.9 + bookish * 1.5,
    gryffindor: extremes * 2.1 + (average >= 7.5 ? 0.4 : 0),
    hufflepuff: (average >= 7.8 ? 1.6 : 0) + (1 - extremes) * 1.2,
    slytherin: (average <= 6.2 ? 1.7 : 0) + harsh * 2.2,
  }

  const [id] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] as [
    HouseId,
    number,
  ]

  const because: Record<HouseId, string> = {
    ravenclaw: `You rate in decimals and your shelf leans to books and games — you are measuring these, not just reacting to them.`,
    gryffindor: `${Math.round(extremes * 100)}% of your ratings sit near the top or the bottom. You do not do lukewarm.`,
    hufflepuff: `Your average is ${average.toFixed(1)}. You find something to love in almost everything you pick up.`,
    slytherin: `Your average is ${average.toFixed(1)}${dumpsters ? ` and you have sent ${dumpsters} to the dumpster` : ''}. The bar is high and everybody knows it.`,
  }

  return { house: HOUSES[id], because: because[id] }
}
