import {
  QueryClient,
  QueryCache,
  dehydrate,
  hydrate,
} from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
} from '@tanstack/react-query-persist-client'
import { createStore, del, get, set } from 'idb-keyval'
import { supabase } from './supabase'
import { accountScope } from './accountScope'
import { isAuthError } from './requestErrors'

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
    const scope = accountScope.capture()
    void supabase.auth
      .refreshSession()
      .then(({ error: refreshError }) => {
        if (!refreshError && accountScope.isCurrent(scope))
          void query.fetch().catch(() => {})
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
      retry: (count, error) => {
        if (isAuthError(error)) return false
        return count < 2
      },
      // Disabled — realtime subscriptions keep data fresh. Window focus refetches
      // cause visible loading spinners every time the user switches tabs.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: { retry: false, networkMode: 'always' },
  },
})

const queryCacheStore = createStore('popcornpal', 'query-cache')
const legacyCacheKey = 'popcorn-query-cache'
const persistedCacheKey = (userId: string) => `popcorn-query-cache:v2:${userId}`
let unsubscribePersistence: (() => void) | undefined
let cacheReady: Promise<void> = Promise.resolve()
let persistenceUserId: string | null = null

declare const __BUILD_TIMESTAMP__: string

/** Called before publishing a new authenticated user to the UI. */
export function setQueryCacheUser(userId: string | null): Promise<void> {
  if (userId === persistenceUserId) return cacheReady
  persistenceUserId = userId
  unsubscribePersistence?.()
  unsubscribePersistence = undefined
  accountScope.set(userId)
  const scope = accountScope.capture()
  // Synchronous clearing prevents even a single render of the previous account.
  void queryClient.cancelQueries()
  queryClient.clear()

  cacheReady = (async () => {
    try {
      // The previous cache was shared across all accounts; never hydrate it.
      await del(legacyCacheKey, queryCacheStore)
      if (!userId) return
      const storage = {
        getItem: (key: string) => get<string>(key, queryCacheStore),
        setItem: (key: string, value: string) =>
          accountScope.isCurrent(scope)
            ? set(key, value, queryCacheStore)
            : Promise.resolve(),
        removeItem: (key: string) => del(key, queryCacheStore),
      }
      const persister = createAsyncStoragePersister({
        storage,
        key: persistedCacheKey(userId),
        throttleTime: 1000,
      })
      const options = {
        queryClient,
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        buster:
          typeof __BUILD_TIMESTAMP__ !== 'undefined'
            ? __BUILD_TIMESTAMP__
            : 'dev',
        dehydrateOptions: {
          shouldDehydrateQuery: (query: {
            queryKey: readonly unknown[]
            state: { status: string }
          }) =>
            ['feed', 'media', 'activity', 'profile', 'people'].includes(
              query.queryKey[0] as string
            ) && query.state.status === 'success',
        },
      }
      // Restore into an isolated client: a slow IndexedDB read from account A
      // cannot hydrate the live client after the user switches to account B.
      const restoredClient = new QueryClient()
      try {
        await persistQueryClientRestore({
          ...options,
          queryClient: restoredClient,
        })
        if (!accountScope.isCurrent(scope)) return
        hydrate(queryClient, dehydrate(restoredClient))
      } finally {
        restoredClient.clear()
      }
      void queryClient.invalidateQueries()
      unsubscribePersistence = persistQueryClientSubscribe(options)
    } catch (error) {
      // Private browsing / full device storage must not prevent signing in.
      console.warn('Query cache is unavailable on this device:', error)
    }
  })()
  return cacheReady
}

export async function clearPersistedQueryCache(userId = persistenceUserId) {
  await del(legacyCacheKey, queryCacheStore)
  if (userId) await del(persistedCacheKey(userId), queryCacheStore)
}

// Run a Supabase query with automatic token refresh on auth failure.
// On the first 401/JWT error, force a token refresh and retry once.
// If the refresh fails the error is re-thrown so TanStack Query surfaces it.
export async function authedQuery<T>(
  fn: () => PromiseLike<{ data: T | null; error: unknown }>
): Promise<T> {
  const scope = accountScope.capture()
  const { data, error } = await fn()

  if (error && isAuthError(error)) {
    const { error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !accountScope.isCurrent(scope)) throw error // session truly gone — surface the original error

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
