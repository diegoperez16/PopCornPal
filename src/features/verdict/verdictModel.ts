// Verdicts: a rating turns into a Poppy, the way a Rotten Tomatoes score turns
// into a tomato. The scale is popcorn's own — including "old maid", the real
// popcorn-trade name for a kernel that never popped.
//
// A Dumpster is deliberately not a rating of zero. Zero still measures a thing;
// a Dumpster refuses to. It is stored as its own flag and never averaged, so
// it can never be quietly turned back into a number.

export type VerdictId =
  | 'golden'
  | 'buttered'
  | 'half'
  | 'oldmaid'
  | 'burnt'
  | 'dumpster'

export type Verdict = {
  id: VerdictId
  /** Shown on the badge. */
  name: string
  /** How people say it out loud. */
  phrase: string
  /** Lowest rating that earns this verdict; absent for the dumpster. */
  min?: number
}

export const DUMPSTER: Verdict = {
  id: 'dumpster',
  name: 'Dumpster',
  phrase: 'total dumpster',
}

/** Highest first, so the first match wins. */
export const RATED_VERDICTS: Verdict[] = [
  { id: 'golden', name: 'Golden', phrase: 'a golden bucket', min: 9 },
  { id: 'buttered', name: 'Buttered', phrase: 'it got buttered', min: 7 },
  { id: 'half', name: 'Half-Popped', phrase: 'half-popped', min: 5 },
  { id: 'oldmaid', name: 'Old Maid', phrase: 'never popped', min: 3 },
  { id: 'burnt', name: 'Burnt', phrase: 'burnt', min: 0 },
]

export const VERDICTS: Verdict[] = [...RATED_VERDICTS, DUMPSTER]

/**
 * The verdict for one person's opinion. Null means they have not said —
 * no rating and no dumpster — which is different from a bad opinion.
 */
export function verdictFor(
  rating: number | null | undefined,
  dumpstered = false
): Verdict | null {
  if (dumpstered) return DUMPSTER
  if (rating === null || rating === undefined || Number.isNaN(rating)) {
    return null
  }
  const clamped = Math.min(10, Math.max(0, rating))
  return RATED_VERDICTS.find((verdict) => clamped >= verdict.min!) ?? null
}

export type CircleOpinion = {
  rating: number | null
  dumpstered?: boolean | null
}

export type CircleVerdict = {
  /** Null when nobody in the circle has said anything. */
  verdict: Verdict | null
  /** Mean of the ratings only; dumpsters are excluded. */
  average: number | null
  /** How many people gave a number. */
  raters: number
  /** How many refused to. Reported alongside, never averaged in. */
  dumpsters: number
}

/**
 * What a group thought. Dumpsters sit beside the average rather than inside
 * it, so two people refusing to rate something cannot be hidden by three
 * people who liked it — and cannot drag the score down either.
 */
export function circleVerdict(opinions: readonly CircleOpinion[]): CircleVerdict {
  const dumpsters = opinions.filter((opinion) => opinion.dumpstered).length
  const ratings = opinions
    .filter((opinion) => !opinion.dumpstered && opinion.rating !== null)
    .map((opinion) => Math.min(10, Math.max(0, opinion.rating as number)))

  if (ratings.length === 0) {
    return {
      verdict: dumpsters > 0 ? DUMPSTER : null,
      average: null,
      raters: 0,
      dumpsters,
    }
  }

  const mean = ratings.reduce((total, n) => total + n, 0) / ratings.length
  // One decimal keeps 7.9499 from displaying as 7.9 while sitting in Buttered.
  const average = Math.round(mean * 10) / 10
  return {
    verdict: verdictFor(average),
    average,
    raters: ratings.length,
    dumpsters,
  }
}
