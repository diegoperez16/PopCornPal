import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { executeQueuedMutationOrRun } from '../../lib/offlineMutationQueue'
import { upsertEpisodeRating as upsertEpisodeRatingMutation } from '../../lib/userMutations'

export const episodeKeys = {
  all: ['episodes'] as const,
  show: (userId: string, showTitle: string) => ['episodes', userId, showTitle] as const,
}

export type EpisodeRatingRow = {
  id: string
  user_id: string
  show_title: string
  show_cover_url: string | null
  show_year: string | null
  season_number: number
  episode_number: number
  episode_title: string | null
  rating: number | null
  notes: string | null
  watched_at: string
  created_at: string
}

export type EpisodeRatingInput = {
  show_title: string
  show_cover_url: string | null
  show_year: string | null
  season_number: number
  episode_number: number
  episode_title?: string | null
  rating: number
  notes?: string | null
}

export function useShowEpisodeRatings(userId: string, showTitle: string) {
  return useQuery({
    queryKey: episodeKeys.show(userId, showTitle),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('episode_ratings')
        .select('*')
        .eq('user_id', userId)
        .eq('show_title', showTitle)
        .order('season_number', { ascending: true })
        .order('episode_number', { ascending: true })
      if (error) throw error
      return (data ?? []) as EpisodeRatingRow[]
    },
    enabled: !!userId && !!showTitle,
  })
}

export function useUpsertEpisodeRating(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EpisodeRatingInput) => {
      return executeQueuedMutationOrRun(
        {
          kind: 'upsert-episode-rating',
          payload: { userId, ...input },
        },
        () => upsertEpisodeRatingMutation({ userId, ...input })
      )
    },
    onSuccess: (result, variables) => {
      if (!result.queued) {
        queryClient.invalidateQueries({
          queryKey: episodeKeys.show(userId, variables.show_title),
        })
      }
    },
  })
}
