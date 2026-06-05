import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, type SearchResult, type Season, type Episode } from '../lib/api'
import { mediaKeys } from '../lib/queryClient'
import { getQueuedOfflineMutations } from '../lib/offlineMutationQueue'
import { useAuthStore } from '../store/authStore'
import { fetchMediaEntries, type MediaEntry, useAddEntry } from './queries/useMediaQueries'
import { useUpsertEpisodeRating } from './queries/useEpisodeQueries'

// Re-export types consumed by the page
export type { SearchResult, Season, Episode }
export type MediaType = 'movie' | 'show' | 'game' | 'book'
export type WatchStatus = 'completed' | 'in-progress' | 'planned' | 'logged'

// Local episode rating (transient, before saving)
export type PendingEpisodeRating = {
  season: number
  episode: number
  episodeTitle?: string
  rating: number
}

const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

function isMatchingLoggedEntry(
  entry: Pick<MediaEntry, 'media_type' | 'title' | 'status'>,
  item: SearchResult
) {
  return (
    entry.status === 'logged' &&
    entry.media_type === item.type &&
    entry.title.trim().toLowerCase() === item.title.trim().toLowerCase()
  )
}

export function useAddEntryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { mutateAsync: addEntry } = useAddEntry(user?.id ?? '')
  const { mutateAsync: upsertEpisodeRating } = useUpsertEpisodeRating(user?.id ?? '')

  // ── Search state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTabRaw] = useState<MediaType>(() => load('popcorn_add_tab', 'movie'))
  const [query, setQuery] = useState(() => load('popcorn_add_query', ''))
  const [results, setResults] = useState<SearchResult[]>(() => load('popcorn_add_results', []))
  const [selectedItem, setSelectedItemRaw] = useState<SearchResult | null>(() => load('popcorn_add_selected', null))
  const [searching, setSearching] = useState(false)

  // ── Log form state ────────────────────────────────────────────────────────
  const [rating, setRating] = useState<number>(() => load('popcorn_add_rating', 0))
  const [status, setStatus] = useState<WatchStatus>(() => load('popcorn_add_status', 'completed'))
  const [notes, setNotes] = useState(() => load('popcorn_add_notes', ''))
  const [watchedDate, setWatchedDate] = useState(() => load('popcorn_add_date', new Date().toISOString().split('T')[0]))

  // ── Episode mode (shows only) ─────────────────────────────────────────────
  const [episodeMode, setEpisodeMode] = useState(false)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [pendingRatings, setPendingRatings] = useState<PendingEpisodeRating[]>([])
  const [loadingSeasons, setLoadingSeasons] = useState(false)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)

  // ── Save state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [duplicateError, setDuplicateError] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('popcorn_add_tab', JSON.stringify(activeTab))
    localStorage.setItem('popcorn_add_query', JSON.stringify(query))
    localStorage.setItem('popcorn_add_results', JSON.stringify(results))
    localStorage.setItem('popcorn_add_selected', JSON.stringify(selectedItem))
    localStorage.setItem('popcorn_add_rating', JSON.stringify(rating))
    localStorage.setItem('popcorn_add_status', JSON.stringify(status))
    localStorage.setItem('popcorn_add_notes', JSON.stringify(notes))
    localStorage.setItem('popcorn_add_date', JSON.stringify(watchedDate))
  }, [activeTab, query, results, selectedItem, rating, status, notes, watchedDate])

  // Hide bottom nav while panel is open
  useEffect(() => {
    document.querySelector('.mobile-nav')?.classList.toggle('hidden', !!selectedItem)
  }, [selectedItem])

  // ── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return }
    let live = true
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        let data: SearchResult[] = []
        if (activeTab === 'movie') data = await api.searchMovies(query)
        else if (activeTab === 'show') data = await api.searchShows(query)
        else if (activeTab === 'game') data = await api.searchGames(query)
        else data = await api.searchBooks(query)
        if (live) setResults(data)
      } catch (e) { console.error(e) }
      finally { if (live) setSearching(false) }
    }, 400)
    return () => { live = false; clearTimeout(t) }
  }, [query, activeTab])

  // ── Fetch seasons when a show is selected ─────────────────────────────────
  useEffect(() => {
    if (!selectedItem || selectedItem.type !== 'show') return
    setLoadingSeasons(true)
    api.getShowSeasons(selectedItem.id as number).then(s => {
      setSeasons(s)
      if (s.length) setSelectedSeason(s[0].season_number)
    }).finally(() => setLoadingSeasons(false))
  }, [selectedItem])

  // ── Fetch episodes when season changes (only in episode mode) ─────────────
  useEffect(() => {
    if (!selectedItem || selectedItem.type !== 'show' || !episodeMode) return
    setLoadingEpisodes(true)
    setEpisodes([])
    api.getSeasonEpisodes(selectedItem.id as number, selectedSeason)
      .then(setEpisodes)
      .finally(() => setLoadingEpisodes(false))
  }, [selectedItem, selectedSeason, episodeMode])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const setActiveTab = useCallback((tab: MediaType) => {
    setActiveTabRaw(tab)
    setResults([])
    setQuery('')
    setSelectedItemRaw(null)
    setEpisodeMode(false)
  }, [])

  const handleSelectItem = useCallback((item: SearchResult) => {
    setSelectedItemRaw(item)
    setRating(0)
    setStatus('completed')
    setNotes('')
    setDuplicateError(false)
    setEpisodeMode(false)
    setPendingRatings([])
  }, [])

  const handleClose = useCallback(() => {
    setSelectedItemRaw(null)
    setEpisodeMode(false)
    setPendingRatings([])
  }, [])

  const handleEnterEpisodeMode = useCallback(() => {
    setEpisodeMode(true)
    if (selectedItem && episodes.length === 0) {
      setLoadingEpisodes(true)
      api.getSeasonEpisodes(selectedItem.id as number, selectedSeason)
        .then(setEpisodes)
        .finally(() => setLoadingEpisodes(false))
    }
  }, [selectedItem, selectedSeason, episodes.length])

  const setPendingEpisodeRating = useCallback((season: number, episode: number, episodeTitle: string | undefined, r: number) => {
    setPendingRatings(prev => {
      const next = prev.filter(e => !(e.season === season && e.episode === episode))
      if (r > 0) next.push({ season, episode, episodeTitle, rating: r })
      return next
    })
  }, [])

  const getPendingEpisodeRating = useCallback((season: number, episode: number): number => {
    return pendingRatings.find(e => e.season === season && e.episode === episode)?.rating ?? 0
  }, [pendingRatings])

  const clearPersistence = () => {
    ['popcorn_add_query','popcorn_add_results','popcorn_add_selected','popcorn_add_rating',
     'popcorn_add_status','popcorn_add_notes','popcorn_add_date'].forEach(k => localStorage.removeItem(k))
  }

  const handleSave = async () => {
    if (!selectedItem || !user) return
    setSaving(true)
    setDuplicateError(false)
    setSaveError(null)
    try {
      if (episodeMode && pendingRatings.length > 0) {
        // Save all pending episode ratings
        await Promise.all(
          pendingRatings.map(pr =>
            upsertEpisodeRating({
              show_title: selectedItem.title,
              show_cover_url: selectedItem.image ?? null,
              show_year: selectedItem.year ?? null,
              season_number: pr.season,
              episode_number: pr.episode,
              episode_title: pr.episodeTitle ?? null,
              rating: pr.rating,
            })
          )
        )
      } else {
        // Check duplicate before saving a whole-show entry
        if (status === 'logged') {
          const queuedMutations = await getQueuedOfflineMutations()
          const hasQueuedDuplicate = queuedMutations.some((mutation) => {
            if (mutation.kind !== 'add-entry' || mutation.payload.userId !== user.id) return false

            const { entry } = mutation.payload
            return (
              entry.media_type === selectedItem.type &&
              entry.title.trim().toLowerCase() === selectedItem.title.trim().toLowerCase() &&
              ['logged', 'completed', 'in-progress'].includes(entry.status)
            )
          })

          let knownEntries = queryClient.getQueryData<MediaEntry[]>(mediaKeys.entries(user.id)) ?? []
          if (knownEntries.length === 0 && navigator.onLine) {
            knownEntries = await queryClient.fetchQuery({
              queryKey: mediaKeys.entries(user.id),
              queryFn: () => fetchMediaEntries(user.id),
            })
          }

          if (hasQueuedDuplicate || knownEntries.some((entry) => isMatchingLoggedEntry(entry, selectedItem))) {
            setDuplicateError(true)
            return
          }
        }
        await addEntry({
          media_type: selectedItem.type,
          title: selectedItem.title,
          rating: rating || null,
          status,
          completed_date: status === 'completed' ? watchedDate : null,
          notes: notes.trim() || null,
          genre: null,
          year: selectedItem.year ? parseInt(selectedItem.year) : null,
          cover_image_url: selectedItem.image || null,
        })
      }
      clearPersistence()
      setSelectedItemRaw(null)
      navigate('/library')
    } catch (error) {
      console.error('Error saving entry:', error)
      setSaveError(error instanceof Error ? error.message : 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return {
    activeTab, query, results, selectedItem,
    rating, setRating,
    status, setStatus,
    notes, setNotes,
    watchedDate, setWatchedDate,
    episodeMode,
    enterEpisodeMode: handleEnterEpisodeMode,
    exitEpisodeMode: useCallback(() => setEpisodeMode(false), []),
    seasons, selectedSeason, setSelectedSeason,
    episodes, pendingRatings,
    loadingSeasons, loadingEpisodes,
    searching, saving, duplicateError, saveError,
    setActiveTab, setQuery,
    selectItem: handleSelectItem,
    handleClose,
    setPendingEpisodeRating,
    getPendingEpisodeRating,
    handleSave,
  }
}
