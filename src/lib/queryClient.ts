import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { supabase } from './supabase'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (count, error: any) => {
        if (error?.code === 'PGRST301' || error?.status === 401 || error?.status === 403) return false
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
      return ['feed', 'media', 'activity'].includes(key) && query.state.status === 'success'
    },
  },
})

// Refresh the session token before every query — this is the single place
// that handles token expiry, replacing all the per-page getSession() calls.
export async function authedQuery<T>(
  fn: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  await supabase.auth.getSession()
  const { data, error } = await fn()
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
