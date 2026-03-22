import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { mediaKeys } from '../../lib/queryClient'

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

async function fetchMediaEntries(userId: string): Promise<MediaEntry[]> {
  await supabase.auth.getSession()
  const { data, error } = await supabase
    .from('media_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MediaEntry[]
}

async function fetchMediaStats(userId: string): Promise<UserStats | null> {
  await supabase.auth.getSession()
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
    staleTime: 5 * 60 * 1000,
  })
}

export function useMediaStats(userId: string) {
  return useQuery({
    queryKey: mediaKeys.stats(userId),
    queryFn: () => fetchMediaStats(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAddEntry(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Omit<MediaEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      await supabase.auth.getSession()

      // Add logged copy if status is completed or in-progress (same logic as original store)
      if (entry.status === 'completed' || entry.status === 'in-progress') {
        const { data: existingLibrary } = await supabase
          .from('media_entries')
          .select('id')
          .eq('user_id', userId)
          .eq('media_type', entry.media_type)
          .eq('title', entry.title)
          .eq('status', 'logged')
          .maybeSingle()

        if (!existingLibrary) {
          await supabase.from('media_entries').insert([{
            ...entry, status: 'logged', user_id: userId, completed_date: null
          }])
        }
      }

      const { error } = await supabase.from('media_entries').insert([{ ...entry, user_id: userId }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.entries(userId) })
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats(userId) })
    },
  })
}

export function useUpdateEntry(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MediaEntry> }) => {
      await supabase.auth.getSession()
      const { error } = await supabase.from('media_entries').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.entries(userId) })
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats(userId) })
    },
  })
}

export function useDeleteEntry(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.auth.getSession()
      const { error } = await supabase.from('media_entries').delete().eq('id', id)
      if (error) throw error
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.entries(userId) })
      queryClient.invalidateQueries({ queryKey: mediaKeys.stats(userId) })
    },
  })
}
