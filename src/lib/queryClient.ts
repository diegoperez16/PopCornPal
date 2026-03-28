import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { supabase } from './supabase'

function isAuthError(error: any): boolean {
  return (
    error?.code === 'PGRST301' ||
    error?.status === 401 ||
    error?.message?.includes('JWT') ||
    error?.message?.includes('token is expired')
  )
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1 min default — short enough that returning to the app sees fresh data,
      // long enough to avoid hammering Supabase during normal navigation.
      // Hot paths (feed, comments) override this with tighter values.
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      // 'always' lets queries fire even when navigator.onLine is false (common on
      // device wake / PWA resume). Without this, TanStack Query silently pauses
      // queries and they show 'fetching' forever until a manual reload.
      networkMode: 'always',
      retry: (count, error: any) => {
        if (isAuthError(error)) return false
        return count < 2
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'popcorn-query-cache',
  throttleTime: 1000,
})

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey[0] as string
      // Persist all main data domains so returning users see cached content instantly.
      return ['feed', 'media', 'activity', 'profile', 'people'].includes(key) && query.state.status === 'success'
    },
  },
})

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
  user: (username: string) => ['profile', 'user', username] as const,
}

export const activityKeys = {
  list: (userId: string) => ['activity', userId] as const,
}
