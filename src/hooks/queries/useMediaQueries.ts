import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { mediaKeys } from '../../lib/queryClient'
import { executeQueuedMutationOrRun } from '../../lib/offlineMutationQueue'
import {
  createMediaEntry,
  deleteMediaEntry,
  updateMediaEntry,
  type MediaEntryMutationInput,
} from '../../lib/userMutations'

export type MediaEntry = {
  id: string
  user_id: string
  media_type: 'movie' | 'show' | 'game' | 'book'
  title: string
  rating: number | null
  status: 'completed' | 'in-progress' | 'planned' | 'logged'
  completed_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  genre?: string | null
  year?: number | null
  cover_image_url?: string | null
}

export type UserStats = {
  user_id?: string
  id?: string
  username?: string
  total_entries?: number
  completed_entries?: number
  movies_count: number
  shows_count: number
  games_count: number
  books_count: number
  avg_rating: number | null
  following_count?: number
  followers_count?: number
}

export async function fetchMediaEntries(userId: string): Promise<MediaEntry[]> {
  const { data, error } = await supabase
    .from('media_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MediaEntry[]
}

async function fetchMediaStats(userId: string): Promise<UserStats | null> {
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data as UserStats | null
}

export function useMediaEntries(userId: string) {
  return useQuery({
    queryKey: mediaKeys.entries(userId),
    queryFn: () => fetchMediaEntries(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useMediaStats(userId: string) {
  return useQuery({
    queryKey: mediaKeys.stats(userId),
    queryFn: () => fetchMediaStats(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useAddEntry(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Omit<MediaEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const mutationEntry: MediaEntryMutationInput = {
        media_type: entry.media_type,
        title: entry.title,
        rating: entry.rating,
        status: entry.status,
        completed_date: entry.completed_date,
        notes: entry.notes,
        genre: entry.genre ?? null,
        year: entry.year ?? null,
        cover_image_url: entry.cover_image_url ?? null,
      }

      return executeQueuedMutationOrRun(
        {
          kind: 'add-entry',
          payload: { userId, entry: mutationEntry },
        },
        () => createMediaEntry(userId, mutationEntry)
      )
    },
    onMutate: async (entry) => {
      await queryClient.cancelQueries({ queryKey: mediaKeys.entries(userId) })
      const previousEntries = queryClient.getQueryData(mediaKeys.entries(userId)) as MediaEntry[] | undefined
      const timestamp = new Date().toISOString()
      const optimisticEntries = [...(previousEntries ?? [])]

      optimisticEntries.unshift({
        id: `offline-entry-${crypto.randomUUID()}`,
        user_id: userId,
        media_type: entry.media_type,
        title: entry.title,
        rating: entry.rating,
        status: entry.status,
        completed_date: entry.completed_date,
        notes: entry.notes,
        created_at: timestamp,
        updated_at: timestamp,
        genre: entry.genre ?? null,
        year: entry.year ?? null,
        cover_image_url: entry.cover_image_url ?? null,
      })

      if ((entry.status === 'completed' || entry.status === 'in-progress') && !optimisticEntries.some(
        existing =>
          existing.status === 'logged' &&
          existing.media_type === entry.media_type &&
          existing.title.toLowerCase() === entry.title.toLowerCase()
      )) {
        optimisticEntries.unshift({
          id: `offline-entry-${crypto.randomUUID()}`,
          user_id: userId,
          media_type: entry.media_type,
          title: entry.title,
          rating: entry.rating,
          status: 'logged',
          completed_date: null,
          notes: entry.notes,
          created_at: timestamp,
          updated_at: timestamp,
          genre: entry.genre ?? null,
          year: entry.year ?? null,
          cover_image_url: entry.cover_image_url ?? null,
        })
      }

      queryClient.setQueryData(mediaKeys.entries(userId), optimisticEntries)
      return { previousEntries }
    },
    onError: (_error, _entry, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(mediaKeys.entries(userId), context.previousEntries)
      }
    },
    onSuccess: (result) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.entries(userId) })
        queryClient.invalidateQueries({ queryKey: mediaKeys.stats(userId) })
      }
    },
  })
}

export function useUpdateEntry(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MediaEntry> }) => {
      return executeQueuedMutationOrRun(
        {
          kind: 'update-entry',
          payload: { id, updates },
        },
        () => updateMediaEntry(id, updates)
      )
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: mediaKeys.entries(userId) })
      const previousEntries = queryClient.getQueryData(mediaKeys.entries(userId)) as MediaEntry[] | undefined
      queryClient.setQueryData(mediaKeys.entries(userId), (old: MediaEntry[] | undefined) =>
        (old ?? []).map(entry =>
          entry.id === id
            ? {
                ...entry,
                ...updates,
                updated_at: new Date().toISOString(),
              }
            : entry
        )
      )
      return { previousEntries }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(mediaKeys.entries(userId), context.previousEntries)
      }
    },
    onSuccess: (result) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.entries(userId) })
        queryClient.invalidateQueries({ queryKey: mediaKeys.stats(userId) })
      }
    },
  })
}

export function useDeleteEntry(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return executeQueuedMutationOrRun(
        {
          kind: 'delete-entry',
          payload: { id },
        },
        () => deleteMediaEntry(id)
      )
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: mediaKeys.entries(userId) })
      const previousEntries = queryClient.getQueryData(mediaKeys.entries(userId))
      queryClient.setQueryData(mediaKeys.entries(userId), (old: MediaEntry[] | undefined) =>
        (old ?? []).filter(e => e.id !== id)
      )
      return { previousEntries }
    },
    onError: (_err, _id, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(mediaKeys.entries(userId), context.previousEntries)
      }
    },
    onSuccess: (result) => {
      if (!result.queued) {
        queryClient.invalidateQueries({ queryKey: mediaKeys.entries(userId) })
        queryClient.invalidateQueries({ queryKey: mediaKeys.stats(userId) })
      }
    },
  })
}
