import { verdictFor } from '../verdict/verdictModel.ts'

/** The four numbers a profile leads with. */
export type ShelfSummary = {
  titles: number
  average: number | null
  goldens: number
  dumpsters: number
}

/** All a summary needs from a row: the score, and whether it was refused. */
export type RatedRow = {
  rating: number | null
  dumpstered?: boolean | null
}

/**
 * Counts a shelf without ever being told what is on it.
 *
 * A visited profile is summarised from ratings alone — no titles, no dates, no
 * covers leave the database — which is the whole reason this takes rows rather
 * than entries. Dumpsters are counted but never averaged: refusing to rate
 * something is not a low score.
 */
export function summarizeShelf(rows: readonly RatedRow[]): ShelfSummary {
  const rated = rows.filter(
    (row) => !row.dumpstered && typeof row.rating === 'number'
  )
  const average = rated.length
    ? rated.reduce((sum, row) => sum + (row.rating as number), 0) / rated.length
    : null
  return {
    titles: rows.length,
    average,
    goldens: rated.filter((row) => verdictFor(row.rating)?.id === 'golden')
      .length,
    dumpsters: rows.filter((row) => row.dumpstered).length,
  }
}
