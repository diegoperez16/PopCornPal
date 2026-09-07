import type { SearchResult } from './api'

export type MediaType = 'movie' | 'show' | 'game' | 'book'
export type WatchStatus = 'completed' | 'in-progress' | 'planned' | 'logged'
export type PendingEpisodeRating = {
  season: number
  episode: number
  episodeTitle?: string
  rating: number
}

export type AddEntryDraft = {
  version: 1
  activeTab: MediaType
  query: string
  item: SearchResult | null
  rating: number
  /** Too bad to rate; mutually exclusive with a rating. */
  dumpstered: boolean
  status: WatchStatus
  notes: string
  watchedDate: string
  episodeMode: boolean
  selectedSeason: number
  pendingRatings: PendingEpisodeRating[]
}

/** A journal date belongs to the user's calendar, not the UTC calendar. */
export function localDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function emptyAddEntryDraft(): AddEntryDraft {
  return {
    version: 1,
    activeTab: 'movie',
    query: '',
    item: null,
    rating: 0,
    dumpstered: false,
    status: 'completed',
    notes: '',
    watchedDate: localDateString(),
    episodeMode: false,
    selectedSeason: 1,
    pendingRatings: [],
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isMediaType = (value: unknown): value is MediaType =>
  ['movie', 'show', 'game', 'book'].includes(String(value))
const validRating = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 10
const positiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && localDateString(date) === value
}

function readItem(value: unknown): SearchResult | null {
  if (
    !isRecord(value) ||
    !isMediaType(value.type) ||
    typeof value.title !== 'string' ||
    !value.title.trim()
  )
    return null
  if (
    typeof value.id !== 'string' &&
    !(typeof value.id === 'number' && Number.isFinite(value.id))
  )
    return null
  return {
    id: value.id,
    type: value.type,
    title: value.title,
    image: typeof value.image === 'string' ? value.image : undefined,
    year: typeof value.year === 'string' ? value.year : undefined,
    description:
      typeof value.description === 'string' ? value.description : undefined,
    tmdbId: typeof value.tmdbId === 'number' ? value.tmdbId : undefined,
  }
}

/** Storage is untrusted: stale or malformed values must never break the composer. */
export function parseAddEntryDraft(value: unknown): AddEntryDraft {
  const fallback = emptyAddEntryDraft()
  if (!isRecord(value) || value.version !== 1) return fallback
  const item = readItem(value.item)
  const pendingRatings: PendingEpisodeRating[] = []
  if (item?.type === 'show' && Array.isArray(value.pendingRatings)) {
    for (const rating of value.pendingRatings) {
      if (
        !isRecord(rating) ||
        !positiveInteger(rating.season) ||
        !positiveInteger(rating.episode) ||
        !validRating(rating.rating) ||
        rating.rating === 0
      )
        continue
      if (
        pendingRatings.some(
          (entry) =>
            entry.season === rating.season && entry.episode === rating.episode
        )
      )
        continue
      pendingRatings.push({
        season: rating.season,
        episode: rating.episode,
        rating: rating.rating,
        episodeTitle:
          typeof rating.episodeTitle === 'string'
            ? rating.episodeTitle
            : undefined,
      })
    }
  }
  return {
    ...fallback,
    activeTab: isMediaType(value.activeTab)
      ? value.activeTab
      : fallback.activeTab,
    query: typeof value.query === 'string' ? value.query.slice(0, 300) : '',
    item,
    dumpstered: Boolean(item && value.dumpstered),
    rating:
      item && !value.dumpstered && validRating(value.rating)
        ? value.rating
        : 0,
    status:
      item &&
      ['completed', 'in-progress', 'planned', 'logged'].includes(
        String(value.status)
      )
        ? (value.status as WatchStatus)
        : 'completed',
    notes:
      item && typeof value.notes === 'string'
        ? value.notes.slice(0, 10000)
        : '',
    watchedDate: isCalendarDate(value.watchedDate)
      ? value.watchedDate
      : fallback.watchedDate,
    episodeMode: item?.type === 'show' && value.episodeMode === true,
    selectedSeason: positiveInteger(value.selectedSeason)
      ? value.selectedSeason
      : 1,
    pendingRatings,
  }
}

export const addEntryDraftKey = (userId: string) =>
  `popcorn:add-entry:v1:${userId}`

export function loadAddEntryDraft(
  userId: string,
  storage: Pick<Storage, 'getItem'> = localStorage
): AddEntryDraft {
  if (!userId) return emptyAddEntryDraft()
  try {
    return parseAddEntryDraft(
      JSON.parse(storage.getItem(addEntryDraftKey(userId)) ?? 'null')
    )
  } catch {
    return emptyAddEntryDraft()
  }
}

export function saveAddEntryDraft(
  userId: string,
  draft: AddEntryDraft,
  storage: Pick<Storage, 'setItem'> = localStorage
): boolean {
  if (!userId) return false
  try {
    storage.setItem(addEntryDraftKey(userId), JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}
