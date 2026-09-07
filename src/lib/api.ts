const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

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

type CatalogRecord = Record<string, unknown>
const isRecord = (value: unknown): value is CatalogRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const string = (value: unknown) =>
  typeof value === 'string' ? value : undefined
const year = (value: unknown) => string(value)?.split('-')[0]
const image = (path: unknown, size: string) =>
  typeof path === 'string' && path
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : undefined

/** Query caching and cancellation belong to the query layer. Transport errors are never empty results. */
async function request(
  url: string,
  signal?: AbortSignal
): Promise<CatalogRecord> {
  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(
      'Couldn’t reach the catalog. Check your connection and try again.'
    )
  }
  if (!response.ok) {
    if (response.status === 429)
      throw new Error('The catalog is busy. Give it a moment, then try again.')
    throw new Error(
      'The catalog is temporarily unavailable. Please try again later.'
    )
  }
  const data: unknown = await response.json()
  if (!isRecord(data))
    throw new Error(
      'The catalog returned an unexpected response. Please try again.'
    )
  return data
}

function records(
  data: CatalogRecord,
  key: string,
  optional = false
): CatalogRecord[] {
  if (optional && data[key] === undefined) return []
  if (!Array.isArray(data[key]))
    throw new Error(
      'The catalog returned an unexpected response. Please try again.'
    )
  return data[key].filter(isRecord)
}

function requireKey(key: string | undefined, catalog: string): string {
  if (!key)
    throw new Error(
      `${catalog} search isn’t available yet. Please try another category.`
    )
  return key
}

async function searchTmdb(
  query: string,
  type: 'movie' | 'show',
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const key = requireKey(TMDB_API_KEY, type === 'movie' ? 'Film' : 'TV')
  const data = await request(
    `https://api.themoviedb.org/3/search/${type === 'show' ? 'tv' : 'movie'}?api_key=${key}&query=${encodeURIComponent(query)}`,
    signal
  )
  return records(data, 'results').flatMap((item) => {
    const title = string(type === 'show' ? item.name : item.title)
    if (typeof item.id !== 'number' || !title) return []
    return [
      {
        id: item.id,
        title,
        type,
        tmdbId: item.id,
        image: image(item.poster_path, 'w342'),
        description: string(item.overview),
        year: year(type === 'show' ? item.first_air_date : item.release_date),
      },
    ]
  })
}

export const api = {
  searchMovies: (query: string, signal?: AbortSignal) =>
    searchTmdb(query, 'movie', signal),
  searchShows: (query: string, signal?: AbortSignal) =>
    searchTmdb(query, 'show', signal),

  async searchBooks(
    query: string,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    const key = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : ''
    const data = await request(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${key}`,
      signal
    )
    return records(data, 'items', true).flatMap((item) => {
      if (
        typeof item.id !== 'string' ||
        !isRecord(item.volumeInfo) ||
        typeof item.volumeInfo.title !== 'string'
      )
        return []
      const info = item.volumeInfo
      const thumbnail = isRecord(info.imageLinks)
        ? string(info.imageLinks.thumbnail)
        : undefined
      return [
        {
          id: item.id,
          title: item.volumeInfo.title,
          type: 'book' as const,
          image: thumbnail?.replace('http://', 'https://'),
          year: year(info.publishedDate),
          description: string(info.description),
        },
      ]
    })
  },

  async searchGames(
    query: string,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    const key = requireKey(RAWG_API_KEY, 'Game')
    const data = await request(
      `https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(query)}`,
      signal
    )
    return records(data, 'results').flatMap((item) => {
      if (typeof item.id !== 'number' || typeof item.name !== 'string')
        return []
      return [
        {
          id: item.id,
          title: item.name,
          type: 'game' as const,
          image: string(item.background_image),
          year: year(item.released),
        },
      ]
    })
  },

  async getShowSeasons(
    tmdbId: number,
    signal?: AbortSignal
  ): Promise<Season[]> {
    const key = requireKey(TMDB_API_KEY, 'TV')
    const data = await request(
      `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${key}`,
      signal
    )
    return records(data, 'seasons').flatMap((season) => {
      if (typeof season.season_number !== 'number' || season.season_number <= 0)
        return []
      return [
        {
          season_number: season.season_number,
          name: string(season.name) ?? `Season ${season.season_number}`,
          episode_count:
            typeof season.episode_count === 'number' ? season.episode_count : 0,
          poster_path: image(season.poster_path, 'w185'),
          air_date: string(season.air_date),
        },
      ]
    })
  },

  async getSeasonEpisodes(
    tmdbId: number,
    seasonNumber: number,
    signal?: AbortSignal
  ): Promise<Episode[]> {
    const key = requireKey(TMDB_API_KEY, 'TV')
    const data = await request(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${key}`,
      signal
    )
    return records(data, 'episodes').flatMap((episode) => {
      if (typeof episode.episode_number !== 'number') return []
      return [
        {
          episode_number: episode.episode_number,
          name: string(episode.name) ?? `Episode ${episode.episode_number}`,
          overview: string(episode.overview),
          still_path: image(episode.still_path, 'w300'),
          air_date: string(episode.air_date),
          runtime:
            typeof episode.runtime === 'number' ? episode.runtime : undefined,
        },
      ]
    })
  },
}
