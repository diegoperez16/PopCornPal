import type { MediaEntry } from '../../hooks/queries/useMediaQueries'

export type MediaType = MediaEntry['media_type']
export type LibrarySort = 'recent' | 'title' | 'rating'
export type EntryDraft = Pick<MediaEntry, 'status'> & {
  rating: number
  /** Too bad to rate; mutually exclusive with a rating. */
  dumpstered: boolean
  notes: string
}

/** A logged entry is the durable library record; activity entries are tracked separately. */
export function collectLibraryEntries(
  entries: readonly MediaEntry[]
): MediaEntry[] {
  const collection = new Map<string, MediaEntry>()
  for (const entry of entries) {
    if (entry.status !== 'logged') continue
    const key = `${entry.media_type}:${entry.title.trim().toLocaleLowerCase()}`
    const existing = collection.get(key)
    if (
      !existing ||
      Date.parse(entry.updated_at) > Date.parse(existing.updated_at)
    ) {
      collection.set(key, entry)
    }
  }
  return [...collection.values()]
}

/**
 * One row per title, for pickers that attach a title to something else.
 *
 * A title accumulates a row per event — the durable `logged` record plus any
 * completed/in-progress/planned activity — so the raw list repeats titles.
 * Pickers want the title itself, represented by its library record when one
 * exists and otherwise by the most recently touched activity record.
 */
export function collectUniqueMedia(
  entries: readonly MediaEntry[]
): MediaEntry[] {
  const byTitle = new Map<string, MediaEntry>()
  for (const entry of entries) {
    const key = `${entry.media_type}:${entry.title.trim().toLocaleLowerCase()}`
    const existing = byTitle.get(key)
    if (!existing) {
      byTitle.set(key, entry)
      continue
    }
    const preferred =
      existing.status === 'logged'
        ? existing
        : entry.status === 'logged'
          ? entry
          : Date.parse(entry.updated_at) > Date.parse(existing.updated_at)
            ? entry
            : existing
    byTitle.set(key, preferred)
  }
  return [...byTitle.values()]
}

export function selectLibraryEntries(
  entries: readonly MediaEntry[],
  {
    type,
    search,
    sort,
    minRating = 0,
    maxRating = 10,
  }: {
    type: MediaType | null
    search: string
    sort: LibrarySort
    /**
     * Keep only titles rated within [minRating, maxRating]. Defaults span the
     * whole scale, so an untouched filter changes nothing.
     *
     * A band narrower than the full scale also excludes dumpstered and unrated
     * titles: refusing to rate something is not a score, so it can satisfy
     * neither "7 and up" nor "the 9s".
     */
    minRating?: number
    maxRating?: number
  }
): MediaEntry[] {
  const query = search.trim().toLocaleLowerCase()
  return entries
    .filter(
      (entry) =>
        (!type || entry.media_type === type) &&
        (!query || entry.title.toLocaleLowerCase().includes(query)) &&
        ((minRating <= 0 && maxRating >= 10) ||
          (!entry.dumpstered &&
            entry.rating !== null &&
            entry.rating >= minRating &&
            entry.rating <= maxRating))
    )
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'rating')
        return (
          (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title)
        )
      return (
        Date.parse(b.updated_at) - Date.parse(a.updated_at) ||
        a.title.localeCompare(b.title)
      )
    })
}

export function countLibraryEntries(
  entries: readonly MediaEntry[]
): Record<MediaType, number> {
  return entries.reduce(
    (counts, entry) => {
      counts[entry.media_type] += 1
      return counts
    },
    { movie: 0, show: 0, game: 0, book: 0 }
  )
}

export function buildEntryUpdates(
  entry: MediaEntry,
  draft: EntryDraft,
  today = new Date().toISOString().slice(0, 10)
): Partial<MediaEntry> {
  return {
    status: draft.status,
    dumpstered: Boolean(draft.dumpstered),
    // A dumpster is a refusal to rate, so it must never carry a number.
    rating:
      !draft.dumpstered && draft.rating > 0
        ? Math.min(10, Math.round(draft.rating * 10) / 10)
        : null,
    notes: draft.notes.trim() || null,
    completed_date:
      draft.status === 'completed' ? entry.completed_date || today : null,
  }
}
