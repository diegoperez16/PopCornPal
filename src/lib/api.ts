const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

// Unified in-memory cache — keyed by type:id strings
const cache = new Map<string, unknown>()
const MAX_CACHE = 100

function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined
}

function setCached(key: string, value: unknown): void {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!)
  cache.set(key, value)
}

export interface SearchResult {
  id: string | number
  title: string
  image?: string
  year?: string
  type: 'movie' | 'book' | 'game' | 'show'
  description?: string
  tmdbId?: number
}

export interface Season {
  season_number: number
  name: string
  episode_count: number
  poster_path?: string
  air_date?: string
}

export interface Episode {
  episode_number: number
  name: string
  overview?: string
  still_path?: string
  air_date?: string
  runtime?: number
}

export const api = {
  async searchMovies(query: string): Promise<SearchResult[]> {
    if (!TMDB_API_KEY) { console.warn('TMDB API Key missing'); return [] }
    const key = `movie:${query}`
    const hit = getCached<SearchResult[]>(key)
    if (hit) return hit
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      )
      const data = await res.json()
      const results: SearchResult[] = data.results.map((m: any) => ({
        id: m.id,
        title: m.title,
        image: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : undefined,
        year: m.release_date ? m.release_date.split('-')[0] : undefined,
        type: 'movie' as const,
        description: m.overview,
        tmdbId: m.id,
      }))
      setCached(key, results)
      return results
    } catch { return [] }
  },

  async searchShows(query: string): Promise<SearchResult[]> {
    if (!TMDB_API_KEY) { console.warn('TMDB API Key missing'); return [] }
    const key = `show:${query}`
    const hit = getCached<SearchResult[]>(key)
    if (hit) return hit
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      )
      const data = await res.json()
      const results: SearchResult[] = data.results.map((s: any) => ({
        id: s.id,
        title: s.name,
        image: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : undefined,
        year: s.first_air_date ? s.first_air_date.split('-')[0] : undefined,
        type: 'show' as const,
        description: s.overview,
        tmdbId: s.id,
      }))
      setCached(key, results)
      return results
    } catch { return [] }
  },

  async searchBooks(query: string): Promise<SearchResult[]> {
    const key = `book:${query}`
    const hit = getCached<SearchResult[]>(key)
    if (hit) return hit
    try {
      const keyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : ''
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${keyParam}`
      )
      const data = await res.json()
      const results: SearchResult[] = (data.items || []).map((b: any) => ({
        id: b.id,
        title: b.volumeInfo.title,
        image: b.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
        year: b.volumeInfo.publishedDate ? b.volumeInfo.publishedDate.split('-')[0] : undefined,
        type: 'book' as const,
        description: b.volumeInfo.description,
      }))
      setCached(key, results)
      return results
    } catch { return [] }
  },

  async searchGames(query: string): Promise<SearchResult[]> {
    if (!RAWG_API_KEY) { console.warn('RAWG API Key missing'); return [] }
    const key = `game:${query}`
    const hit = getCached<SearchResult[]>(key)
    if (hit) return hit
    try {
      const res = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}`
      )
      const data = await res.json()
      const results: SearchResult[] = data.results.map((g: any) => ({
        id: g.id,
        title: g.name,
        image: g.background_image,
        year: g.released ? g.released.split('-')[0] : undefined,
        type: 'game' as const,
        description: '',
      }))
      setCached(key, results)
      return results
    } catch { return [] }
  },

  /** Fetch all non-special seasons for a TMDB show. */
  async getShowSeasons(tmdbId: number): Promise<Season[]> {
    if (!TMDB_API_KEY) return []
    const key = `seasons:${tmdbId}`
    const hit = getCached<Season[]>(key)
    if (hit) return hit
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`
      )
      const data = await res.json()
      const seasons: Season[] = (data.seasons || [])
        .filter((s: any) => s.season_number > 0)
        .map((s: any) => ({
          season_number: s.season_number,
          name: s.name,
          episode_count: s.episode_count,
          poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w185${s.poster_path}` : undefined,
          air_date: s.air_date,
        }))
      setCached(key, seasons)
      return seasons
    } catch { return [] }
  },

  /** Fetch all episodes for a given season of a TMDB show. */
  async getSeasonEpisodes(tmdbId: number, seasonNumber: number): Promise<Episode[]> {
    if (!TMDB_API_KEY) return []
    const key = `episodes:${tmdbId}:${seasonNumber}`
    const hit = getCached<Episode[]>(key)
    if (hit) return hit
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
      )
      const data = await res.json()
      const episodes: Episode[] = (data.episodes || []).map((e: any) => ({
        episode_number: e.episode_number,
        name: e.name,
        overview: e.overview,
        still_path: e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : undefined,
        air_date: e.air_date,
        runtime: e.runtime,
      }))
      setCached(key, episodes)
      return episodes
    } catch { return [] }
  },
}
