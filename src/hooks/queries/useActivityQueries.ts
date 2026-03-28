import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { activityKeys } from '../../lib/queryClient'
import type { MediaEntry } from '../queries/useMediaQueries'

async function fetchActivity(userId: string): Promise<MediaEntry[]> {
  const { data, error } = await supabase
    .from('media_entries')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'logged')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MediaEntry[]
}

export function useActivity(userId: string) {
  return useQuery({
    queryKey: activityKeys.list(userId),
    queryFn: () => fetchActivity(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}
