import { QueryClient, QueryCache } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { persistQueryClientRestore, persistQueryClientSubscribe } from '@tanstack/react-query-persist-client'
import { createStore, del, get, set } from 'idb-keyval'
import { supabase } from './supabase'

function isAuthError(error: any): boolean {
  return (
    error?.code === 'PGRST301' ||
    error?.status === 401 ||
    error?.message?.includes('JWT') ||
    error?.message?.includes('token is expired')
  )
}

// Global recovery for expired access tokens. While the PWA is backgrounded the
// browser suspends timers, so supabase-js's auto-refresh never fires and the
// JWT silently expires. On return, a query can fail with an auth error — and
// since the retry policy below skips auth errors (no point retrying with the
// same dead token), without this the stale cached data would just sit on screen.
// Here we refresh the session once per query, then re-run that query with the
// fresh token. The per-query guard (reset on success) prevents refresh loops if
// the session is genuinely gone.
const authRecoveryAttempted = new WeakSet<object>()
const queryCache = new QueryCache({
  onError: (error, query) => {
    if (!isAuthError(error) || authRecoveryAttempted.has(query)) return
    authRecoveryAttempted.add(query)
    void supabase.auth
      .refreshSession()
      .then(({ error: refreshError }) => {
        if (!refreshError) void query.fetch().catch(() => {})
      })
      .catch(() => {})
  },
  onSuccess: (_data, query) => {
    authRecoveryAttempted.delete(query)
  },
})

export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      // 'always' lets queries fire even when navigator.onLine is false (common on
      // device wake / PWA resume). Without this, TanStack Query silently pauses
      // queries and they show 'fetching' forever until a manual reload.
      networkMode: 'always',
      retry: (count, error: any) => {
        if (isAuthError(error)) return false
        return count < 2
      },
      // Disabled — realtime subscriptions keep data fresh. Window focus refetches
      // cause visible loading spinners every time the user switches tabs.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: { retry: false },
  },
})

const queryCacheStore = createStore('popcornpal', 'query-cache')
const persistedQueryCacheKey = 'popcorn-query-cache'

const persistedQueryStorage = {
  getItem: (key: string) => get<string>(key, queryCacheStore),
  setItem: (key: string, value: string) => set(key, value, queryCacheStore),
  removeItem: (key: string) => del(key, queryCacheStore),
}

declare const __BUILD_TIMESTAMP__: string

const persister = createAsyncStoragePersister({
  storage: persistedQueryStorage,
  key: persistedQueryCacheKey,
  throttleTime: 1000,
})

const persistOptions = {
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  buster: typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) => {
      const key = query.queryKey[0] as string
      return ['feed', 'media', 'activity', 'profile', 'people'].includes(key) && query.state.status === 'success'
    },
  },
}

// Restore cached queries from IndexedDB, then mark them all stale so mounted
// queries refetch in the background on every page load. Users still see cached
// data instantly (no loading spinner), but it's always verified against the
// server. The buster key changes on every build, so deploys discard the old
// IndexedDB cache entirely.
persistQueryClientRestore(persistOptions).then(() => {
  queryClient.invalidateQueries()
})
persistQueryClientSubscribe(persistOptions)

export async function clearPersistedQueryCache() {
  await persistedQueryStorage.removeItem(persistedQueryCacheKey)
}

// Run a Supabase query with automatic token refresh on auth failure.
// On the first 401/JWT error, force a token refresh and retry once.
// If the refresh fails the error is re-thrown so TanStack Query surfaces it.
export async function authedQuery<T>(
  fn: () => PromiseLike<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await fn()

  if (error && isAuthError(error)) {
    const { error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) throw error // session truly gone — surface the original error

    // Token refreshed — retry the query once
    const { data: retryData, error: retryError } = await fn()
    if (retryError) throw retryError
    return retryData as T
  }

  if (error) throw error
  return data as T
}

// ─── Query key factories ────────────────────────────────────────────────────
export const feedKeys = {
  all: ['feed'] as const,
  list: (userId: string) => ['feed', 'list', userId] as const,
  comments: (postId: string) => ['feed', 'comments', postId] as const,
}

export const mediaKeys = {
  all: ['media'] as const,
  entries: (userId: string) => ['media', 'entries', userId] as const,
  stats: (userId: string) => ['media', 'stats', userId] as const,
}

export const peopleKeys = {
  counts: (userId: string) => ['people', 'counts', userId] as const,
  followers: (userId: string) => ['people', 'followers', userId] as const,
  following: (userId: string) => ['people', 'following', userId] as const,
  explore: (userId: string) => ['people', 'explore', userId] as const,
}

export const profileKeys = {
  own: (userId: string) => ['profile', 'own', userId] as const,
  user: (username: string, viewerId: string | null = null) =>
    ['profile', 'user', username, viewerId ?? 'anon'] as const,
}

export const activityKeys = {
  list: (userId: string) => ['activity', userId] as const,
}
