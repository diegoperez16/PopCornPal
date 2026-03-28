import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { peopleKeys } from '../../lib/queryClient'
import type { ProfileWithFollowStatus } from '../../store/socialStore'

async function fetchPeopleCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
  const [followersResult, followingResult] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  return {
    followersCount: followersResult.count ?? 0,
    followingCount: followingResult.count ?? 0,
  }
}

async function fetchFollowers(userId: string): Promise<ProfileWithFollowStatus[]> {
  const { data: followsData, error: followsError } = await supabase
    .from('follows')
    .select(`follower_id, follower:profiles!follower_id (id, username, avatar_url, bio)`)
    .eq('following_id', userId)
    .range(0, 99)

  if (followsError) throw followsError
  if (!followsData || followsData.length === 0) return []

  const profiles = followsData.map(f => f.follower).filter(Boolean) as any[]
  const followerIds = profiles.map(p => p.id)

  const { data: myFollowingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .in('following_id', followerIds)

  const myFollowingSet = new Set(myFollowingData?.map(f => f.following_id))

  return profiles.map(profile => ({
    ...profile,
    isFollowing: myFollowingSet.has(profile.id),
    isFollower: true,
  }))
}

async function fetchFollowing(userId: string): Promise<ProfileWithFollowStatus[]> {
  const { data: followsData, error: followsError } = await supabase
    .from('follows')
    .select(`following_id, following:profiles!following_id (id, username, avatar_url, bio)`)
    .eq('follower_id', userId)
    .range(0, 99)

  if (followsError) throw followsError
  if (!followsData || followsData.length === 0) return []

  const profiles = followsData.map(f => f.following).filter(Boolean) as any[]
  const followingIds = profiles.map(p => p.id)

  const { data: theirFollowingData } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .in('follower_id', followingIds)

  const theirFollowingSet = new Set(theirFollowingData?.map(f => f.follower_id))

  return profiles.map(profile => ({
    ...profile,
    isFollowing: true,
    isFollower: theirFollowingSet.has(profile.id),
  }))
}

async function fetchExploreUsers(userId: string): Promise<ProfileWithFollowStatus[]> {
  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  const followingIds = new Set(followingData?.map(f => f.following_id) ?? [])
  followingIds.add(userId)

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio')
    .order('created_at', { ascending: false })
    .limit(40)

  if (!profiles) return []

  const notFollowing = profiles.filter(p => !followingIds.has(p.id))
  const candidateIds = notFollowing.map(p => p.id)

  const { data: theirFollows } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .in('follower_id', candidateIds)

  const theirFollowSet = new Set(theirFollows?.map(f => f.follower_id) ?? [])

  return notFollowing.map(p => ({
    ...p,
    isFollowing: false,
    isFollower: theirFollowSet.has(p.id),
  }))
}

async function fetchSearchPeople(userId: string, query: string): Promise<ProfileWithFollowStatus[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, bio')
    .ilike('username', `%${query}%`)
    .neq('id', userId)
    .limit(20)

  if (error) throw error
  if (!profiles || profiles.length === 0) return []

  const profileIds = profiles.map(p => p.id)

  const [followingRes, followersRes] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', profileIds),
    supabase.from('follows').select('follower_id').eq('following_id', userId).in('follower_id', profileIds),
  ])

  const followingIds = new Set(followingRes.data?.map(f => f.following_id) ?? [])
  const followerIds = new Set(followersRes.data?.map(f => f.follower_id) ?? [])

  return profiles.map(profile => ({
    ...profile,
    isFollowing: followingIds.has(profile.id),
    isFollower: followerIds.has(profile.id),
  }))
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function usePeopleCounts(userId: string) {
  return useQuery({
    queryKey: peopleKeys.counts(userId),
    queryFn: () => fetchPeopleCounts(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: peopleKeys.followers(userId),
    queryFn: () => fetchFollowers(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: peopleKeys.following(userId),
    queryFn: () => fetchFollowing(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useExploreUsers(userId: string) {
  return useQuery({
    queryKey: peopleKeys.explore(userId),
    queryFn: () => fetchExploreUsers(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useFollowUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from('follows').insert({ follower_id: userId, following_id: profileId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.counts(userId) })
      queryClient.invalidateQueries({ queryKey: peopleKeys.following(userId) })
      queryClient.invalidateQueries({ queryKey: peopleKeys.explore(userId) })
    },
  })
}

export function useUnfollowUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', profileId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.counts(userId) })
      queryClient.invalidateQueries({ queryKey: peopleKeys.following(userId) })
      queryClient.invalidateQueries({ queryKey: peopleKeys.explore(userId) })
      queryClient.invalidateQueries({ queryKey: peopleKeys.followers(userId) })
    },
  })
}

export function useSearchPeople(userId: string, query: string) {
  return useQuery({
    queryKey: ['people', 'search', userId, query],
    queryFn: () => fetchSearchPeople(userId, query),
    enabled: !!userId && query.length >= 2,
    staleTime: 30 * 1000,
  })
}
