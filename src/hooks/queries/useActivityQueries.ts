import { useQuery } from '@tanstack/react-query'
import { mediaKeys } from '../../lib/queryClient'
import { fetchMediaEntries, type MediaEntry } from '../queries/useMediaQueries'

export function useActivity(userId: string) {
  return useQuery({
    queryKey: mediaKeys.entries(userId),
    queryFn: () => fetchMediaEntries(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    select: (entries: MediaEntry[]) =>
      entries
        .filter(entry => entry.status !== 'logged')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
  })
}
