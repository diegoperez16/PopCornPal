import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type SearchResult } from '../lib/api'
import {
  emptyAddEntryDraft,
  isCalendarDate,
  loadAddEntryDraft,
  localDateString,
  saveAddEntryDraft,
  type AddEntryDraft,
  type MediaType,
  type WatchStatus,
} from '../lib/addEntryDraft'
import { mediaKeys } from '../lib/queryClient'
import { getQueuedOfflineMutations } from '../lib/offlineMutationQueue'
import { useAuthStore } from '../store/authStore'
import {
  fetchMediaEntries,
  type MediaEntry,
  useAddEntry,
} from './queries/useMediaQueries'
import { useUpsertEpisodeRating } from './queries/useEpisodeQueries'

export type { SearchResult, Season, Episode } from '../lib/api'
export type {
  MediaType,
  WatchStatus,
  PendingEpisodeRating,
} from '../lib/addEntryDraft'
export type SaveFeedback = { title: string; detail: string }

function matchesTitle(
  entry: Pick<MediaEntry, 'media_type' | 'title'>,
  item: SearchResult
) {
  return (
    entry.media_type === item.type &&
    entry.title.trim().toLowerCase() === item.title.trim().toLowerCase()
  )
}

const errorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message
  return fallback
}

/** Owns the logging workflow; presentation never reads storage or mutates the DOM. */
export function useAddEntryPage() {
  const userId = useAuthStore((state) => state.user?.id ?? '')
  const queryClient = useQueryClient()
  const { mutateAsync: addEntry } = useAddEntry(userId)
  const { mutateAsync: upsertEpisodeRating } = useUpsertEpisodeRating(userId)
  const [session, setSession] = useState(() => ({
    userId,
    draft: loadAddEntryDraft(userId),
    open: false,
  }))
  // A mounted page can outlive an account change. Never write one account's draft to another key.
  if (session.userId !== userId) {
    setSession({ userId, draft: loadAddEntryDraft(userId), open: false })
  }
  const draft = session.draft
  const {
    activeTab,
    query,
    item,
    rating,
    status,
    notes,
    watchedDate,
    episodeMode,
    selectedSeason,
    pendingRatings,
  } = draft
  const selectedItem = session.open ? item : null
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [duplicateError, setDuplicateError] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null)
  const [draftStorageAvailable, setDraftStorageAvailable] = useState(true)
  const [search, setSearch] = useState({ tab: activeTab, query: query.trim() })

  const updateDraft = useCallback(
    (patch: Partial<AddEntryDraft>) => {
      if (savingRef.current) return
      setSession((current) =>
        current.userId === userId
          ? { ...current, draft: { ...current.draft, ...patch } }
          : current
      )
    },
    [userId]
  )

  useEffect(() => {
    if (session.userId !== userId) return
    const persisted = saveAddEntryDraft(userId, session.draft)
    // Storage availability is external state (private mode, full disk, or disabled storage).
    const timer = window.setTimeout(
      () => setDraftStorageAvailable(persisted),
      0
    )
    return () => window.clearTimeout(timer)
  }, [session.draft, session.userId, userId])

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearch({ tab: activeTab, query: query.trim() }),
      350
    )
    return () => window.clearTimeout(timer)
  }, [activeTab, query])

  const searchQuery = useQuery({
    queryKey: ['catalog', 'search', search.tab, search.query],
    queryFn: ({ signal }) => {
      if (search.tab === 'movie') return api.searchMovies(search.query, signal)
      if (search.tab === 'show') return api.searchShows(search.query, signal)
      if (search.tab === 'game') return api.searchGames(search.query, signal)
      return api.searchBooks(search.query, signal)
    },
    enabled: !!search.query,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const searchIsCurrent =
    activeTab === search.tab && query.trim() === search.query
  const results =
    searchIsCurrent && query.trim() ? (searchQuery.data ?? []) : []
  const searching =
    !!query.trim() && (!searchIsCurrent || searchQuery.isFetching)
  const showId =
    selectedItem?.type === 'show'
      ? (selectedItem.tmdbId ?? Number(selectedItem.id))
      : null
  const seasonsQuery = useQuery({
    queryKey: ['catalog', 'seasons', showId],
    queryFn: ({ signal }) => api.getShowSeasons(showId!, signal),
    enabled: !!showId,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })
  const seasons = seasonsQuery.data ?? []
  const effectiveSeason = seasons.some(
    (season) => season.season_number === selectedSeason
  )
    ? selectedSeason
    : (seasons[0]?.season_number ?? selectedSeason)
  const episodesQuery = useQuery({
    queryKey: ['catalog', 'episodes', showId, effectiveSeason],
    queryFn: ({ signal }) =>
      api.getSeasonEpisodes(showId!, effectiveSeason, signal),
    enabled: !!showId && episodeMode && seasons.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const clearErrors = () => {
    setDuplicateError(false)
    setSaveError(null)
  }
  const handleClose = useCallback(() => {
    if (!savingRef.current)
      setSession((current) => ({ ...current, open: false }))
  }, [])
  const setActiveTab = (tab: MediaType) => {
    updateDraft({ activeTab: tab, query: '' })
    setSaveFeedback(null)
  }
  const selectItem = (nextItem: SearchResult) => {
    if (savingRef.current) return
    clearErrors()
    setSaveFeedback(null)
    setSession((current) => {
      const resume =
        current.draft.item?.id === nextItem.id &&
        current.draft.item.type === nextItem.type
      return {
        ...current,
        open: true,
        draft: resume
          ? current.draft
          : {
              ...emptyAddEntryDraft(),
              activeTab: current.draft.activeTab,
              query: current.draft.query,
              item: nextItem,
            },
      }
    })
  }
  const discardDraft = () => {
    if (savingRef.current) return
    setSession((current) => ({
      ...current,
      open: false,
      draft: {
        ...emptyAddEntryDraft(),
        activeTab: current.draft.activeTab,
        query: current.draft.query,
      },
    }))
    clearErrors()
  }
  const setStatus = (nextStatus: WatchStatus) => {
    clearErrors()
    updateDraft({
      status: nextStatus,
      ...(nextStatus === 'completed' && !watchedDate
        ? { watchedDate: localDateString() }
        : {}),
    })
  }
  const setPendingEpisodeRating = (
    season: number,
    episode: number,
    episodeTitle: string | undefined,
    nextRating: number
  ) => {
    if (savingRef.current) return
    setSession((current) => {
      const rest = current.draft.pendingRatings.filter(
        (entry) => entry.season !== season || entry.episode !== episode
      )
      const validRating = Math.min(
        10,
        Math.max(0, Math.round(nextRating * 10) / 10)
      )
      return {
        ...current,
        draft: {
          ...current.draft,
          pendingRatings:
            validRating > 0
              ? [
                  ...rest,
                  { season, episode, episodeTitle, rating: validRating },
                ]
              : rest,
        },
      }
    })
  }

  const handleSave = async () => {
    if (savingRef.current || !selectedItem) return
    clearErrors()
    if (!userId) {
      setSaveError(
        'Sign in again to save this entry. Your draft is still here.'
      )
      return
    }
    if (episodeMode && pendingRatings.length === 0) {
      setSaveError('Add at least one episode rating first.')
      return
    }
    if (
      !episodeMode &&
      status === 'completed' &&
      (!isCalendarDate(watchedDate) || watchedDate > localDateString())
    ) {
      setSaveError('Choose a valid finish date that is today or earlier.')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      let queued = false
      const year = Number.parseInt(selectedItem.year ?? '', 10)
      const baseEntry = {
        media_type: selectedItem.type,
        title: selectedItem.title,
        genre: null,
        year: Number.isFinite(year) ? year : null,
        cover_image_url: selectedItem.image || null,
      }
      let alreadyInLibrary = false
      if (episodeMode || status === 'logged') {
        const queuedMutations = await getQueuedOfflineMutations()
        const cachedEntries = queryClient.getQueryData<MediaEntry[]>(
          mediaKeys.entries(userId)
        )
        const knownEntries =
          cachedEntries ??
          (navigator.onLine
            ? await queryClient.fetchQuery({
                queryKey: mediaKeys.entries(userId),
                queryFn: () => fetchMediaEntries(userId),
              })
            : [])
        const countsAsLibraryEntry = (
          entry: Pick<MediaEntry, 'media_type' | 'title' | 'status'>
        ) =>
          matchesTitle(entry, selectedItem) &&
          (episodeMode || entry.status !== 'planned')
        alreadyInLibrary =
          (knownEntries ?? []).some(countsAsLibraryEntry) ||
          queuedMutations.some(
            (mutation) =>
              mutation.kind === 'add-entry' &&
              mutation.payload.userId === userId &&
              countsAsLibraryEntry(mutation.payload.entry)
          )
        if (!episodeMode && alreadyInLibrary) {
          setDuplicateError(true)
          return
        }
      }

      if (episodeMode) {
        // Create the library anchor first. Sequential upserts also make partial failures retryable:
        // only the ratings that remain unsaved stay in the draft.
        if (!alreadyInLibrary) {
          const result = await addEntry({
            ...baseEntry,
            rating: null,
            status: 'logged',
            completed_date: null,
            notes: null,
          })
          queued ||= result.queued
        }
        for (const pending of pendingRatings) {
          const result = await upsertEpisodeRating({
            show_title: selectedItem.title,
            show_cover_url: selectedItem.image ?? null,
            show_year: selectedItem.year ?? null,
            season_number: pending.season,
            episode_number: pending.episode,
            episode_title: pending.episodeTitle ?? null,
            rating: pending.rating,
          })
          queued ||= result.queued
          setSession((current) => {
            if (current.userId !== userId) return current
            const nextDraft = {
              ...current.draft,
              pendingRatings: current.draft.pendingRatings.filter(
                (entry) =>
                  entry.season !== pending.season ||
                  entry.episode !== pending.episode
              ),
            }
            saveAddEntryDraft(userId, nextDraft)
            return { ...current, draft: nextDraft }
          })
        }
      } else {
        const result = await addEntry({
          ...baseEntry,
          rating:
            status === 'completed' || status === 'logged'
              ? rating || null
              : null,
          status,
          completed_date: status === 'completed' ? watchedDate : null,
          notes: notes.trim() || null,
        })
        queued = result.queued
      }

      const resetDraft = { ...emptyAddEntryDraft(), activeTab, query }
      saveAddEntryDraft(userId, resetDraft)
      setSession((current) =>
        current.userId === userId
          ? { ...current, draft: resetDraft, open: false }
          : current
      )
      setSaveFeedback({
        title: queued
          ? 'Saved on this device'
          : episodeMode
            ? `Saved ${pendingRatings.length} episode rating${pendingRatings.length === 1 ? '' : 's'}`
            : 'Saved to your library',
        detail: queued
          ? `${selectedItem.title} will sync when you’re back online.`
          : episodeMode && !alreadyInLibrary
            ? `${selectedItem.title} was also added to your library.`
            : `${selectedItem.title} is ready in your library. Keep exploring.`,
      })
    } catch (error) {
      setSaveError(
        errorMessage(
          error,
          'We couldn’t save this entry. Your draft is safe to try again.'
        )
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return {
    activeTab,
    setActiveTab,
    query,
    setQuery: (value: string) => updateDraft({ query: value }),
    results,
    selectedItem,
    selectItem,
    handleClose,
    draftItem: item,
    discardDraft,
    resumeDraft: () =>
      setSession((current) => ({ ...current, open: !!current.draft.item })),
    draftStorageAvailable,
    rating,
    setRating: (value: number) => updateDraft({ rating: value }),
    status,
    setStatus,
    notes,
    setNotes: (value: string) => updateDraft({ notes: value }),
    watchedDate,
    setWatchedDate: (value: string) => updateDraft({ watchedDate: value }),
    episodeMode,
    enterEpisodeMode: () => {
      clearErrors()
      updateDraft({ episodeMode: true })
    },
    exitEpisodeMode: () => {
      clearErrors()
      updateDraft({ episodeMode: false })
    },
    seasons,
    selectedSeason: effectiveSeason,
    setSelectedSeason: (value: number) =>
      updateDraft({ selectedSeason: value }),
    episodes: episodesQuery.data ?? [],
    pendingRatings,
    loadingSeasons: seasonsQuery.isFetching,
    loadingEpisodes: episodesQuery.isFetching,
    seasonError: seasonsQuery.error
      ? errorMessage(seasonsQuery.error, 'We couldn’t load seasons.')
      : null,
    episodeError: episodesQuery.error
      ? errorMessage(episodesQuery.error, 'We couldn’t load episodes.')
      : null,
    retrySeasons: () => {
      void seasonsQuery.refetch()
    },
    retryEpisodes: () => {
      void episodesQuery.refetch()
    },
    searching,
    searchError:
      searchIsCurrent && searchQuery.error
        ? errorMessage(
            searchQuery.error,
            'Search is unavailable. Please try again.'
          )
        : null,
    retrySearch: () => {
      void searchQuery.refetch()
    },
    saving,
    duplicateError,
    saveError,
    saveFeedback,
    dismissSaveFeedback: () => setSaveFeedback(null),
    setPendingEpisodeRating,
    getPendingEpisodeRating: (season: number, episode: number) =>
      pendingRatings.find(
        (entry) => entry.season === season && entry.episode === episode
      )?.rating ?? 0,
    handleSave,
  }
}
