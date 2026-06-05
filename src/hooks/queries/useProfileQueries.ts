import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { profileKeys, peopleKeys } from '../../lib/queryClient'
import type { UserBadge } from '../../lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  avatar_crop?: { x: number; y: number; scale: number } | null
  bg_url: string | null
  bg_opacity: number | null
  bg_crop?: any | null
  created_at: string
}

export type ProfilePost = {
  id: string
  content: string
  media_entry_id: string | null
  created_at: string
  likes_count: number
  comments_count: number
  user_liked: boolean
  media_entries?: {
    title: string
    media_type: 'movie' | 'show' | 'game' | 'book'
    rating: number | null
    cover_image_url: string | null
  }
}

export type ProfileMediaEntry = {
  id: string
  title: string
  media_type: 'movie' | 'show' | 'game' | 'book'
  status: string
  rating: number | null
  cover_image_url: string | null
  updated_at: string
  created_at: string
  year?: number
  genre?: string
  notes?: string
}

export type Favorite = {
  id: string
  media_entry: ProfileMediaEntry
}

export type OwnProfileData = {
  entries: any[]
  badges: any[]
  favorites: any[]
  userBadges: UserBadge[]
}

// ─── Own Profile ─────────────────────────────────────────────────────────────

async function fetchOwnProfileData(userId: string): Promise<OwnProfileData> {
  const [entriesRes, badgesRes, favoritesRes, userBadgesRes] = await Promise.all([
    supabase.from('media_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('badges').select('*'),
    supabase.from('profile_favorites').select('*, media_entry:media_entries(*)').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('user_badges').select('*, badges(*)').eq('user_id', userId),
  ])
  return {
    entries: entriesRes.data ?? [],
    badges: badgesRes.data ?? [],
    favorites: favoritesRes.data ?? [],
    userBadges: (userBadgesRes.data ?? []) as UserBadge[],
  }
}

export function useOwnProfileData(userId: string) {
  return useQuery({
    queryKey: profileKeys.own(userId),
    queryFn: () => fetchOwnProfileData(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  })
}

// ─── User Profile ─────────────────────────────────────────────────────────────

async function fetchUserProfile(username: string, currentUserId: string | null) {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (profileError) throw profileError

  const [
    badgesResult,
    followersResult,
    followingResult,
    currentUserFollowResult,
    favoritesResult,
  ] = await Promise.all([
    supabase.from('user_badges').select('*, badges(*)').eq('user_id', profileData.id),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileData.id),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileData.id),
    currentUserId
      ? supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', currentUserId).eq('following_id', profileData.id)
      : Promise.resolve({ count: 0, error: null }),
    supabase.from('profile_favorites').select('*, media_entry:media_entries(*)').eq('user_id', profileData.id).order('created_at', { ascending: true }),
  ])

  return {
    profile: profileData as UserProfile,
    userBadges: (badgesResult.data ?? []) as UserBadge[],
    followersCount: followersResult.count ?? 0,
    followingCount: followingResult.count ?? 0,
    isFollowing: (currentUserFollowResult.count ?? 0) > 0,
    favorites: (favoritesResult.data ?? []) as Favorite[],
  }
}

export function useUserProfile(username: string | undefined, currentUserId: string | null) {
  return useQuery({
    queryKey: profileKeys.user(username ?? '', currentUserId),
    queryFn: () => fetchUserProfile(username!, currentUserId),
    enabled: !!username,
    staleTime: 3 * 60 * 1000,
  })
}

async function fetchUserPosts(profileUserId: string, currentUserId: string | null): Promise<ProfilePost[]> {
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`*, profiles:user_id(username, avatar_url, avatar_crop), media_entries:media_entry_id(title, media_type, rating, cover_image_url)`)
    .eq('user_id', profileUserId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (postsError) throw postsError

  const rawPosts = postsData ?? []
  const postIds = rawPosts.map((p: any) => p.id)
  const likedPostIds = new Set<string>()

  // If we have posts, fetch which ones the current user liked
  if (currentUserId && postIds.length > 0) {
    const { data: userLikes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds)
    if (userLikes) userLikes.forEach(like => likedPostIds.add(like.post_id))
  }

  return rawPosts.map((post: any) => ({
    ...post,
    // Use trigger-maintained counter columns — avoids expensive COUNT subqueries
    likes_count: post.likes_count ?? 0,
    comments_count: post.comments_count ?? 0,
    user_liked: likedPostIds.has(post.id),
  }))
}

export function useUserPosts(profileUserId: string | undefined, currentUserId: string | null) {
  return useQuery({
    queryKey: ['profile', 'posts', profileUserId, currentUserId],
    queryFn: () => fetchUserPosts(profileUserId!, currentUserId),
    enabled: !!profileUserId,
    staleTime: 2 * 60 * 1000,
  })
}

async function fetchUserRecentActivity(profileUserId: string): Promise<ProfileMediaEntry[]> {
  const { data, error } = await supabase
    .from('media_entries')
    .select('*')
    .eq('user_id', profileUserId)
    .neq('status', 'logged')
    .order('updated_at', { ascending: false })
    .limit(5)

  if (error) throw error
  return (data ?? []) as ProfileMediaEntry[]
}

export function useUserRecentActivity(profileUserId: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'activity', profileUserId],
    queryFn: () => fetchUserRecentActivity(profileUserId!),
    enabled: !!profileUserId,
    staleTime: 3 * 60 * 1000,
  })
}

// ─── Follow / Unfollow on Profile Page ────────────────────────────────────────

export function useFollowUserProfile(currentUserId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ targetUserId, isCurrentlyFollowing }: { targetUserId: string; isCurrentlyFollowing: boolean; username: string }) => {
      if (isCurrentlyFollowing) {
        const { error } = await supabase.from('follows').delete().eq('follower_id', currentUserId!).eq('following_id', targetUserId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: currentUserId!, following_id: targetUserId })
        if (error) throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.user(variables.username, currentUserId) })
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: peopleKeys.counts(currentUserId) })
        queryClient.invalidateQueries({ queryKey: peopleKeys.following(currentUserId) })
        queryClient.invalidateQueries({ queryKey: peopleKeys.explore(currentUserId) })
      }
    },
  })
}

export function useToggleUserPostLike(currentUserId: string | null, profileUserId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!currentUserId) throw new Error('Not authenticated')
      if (isLiked) {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId })
        if (error) throw error
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      const queryKey = ['profile', 'posts', profileUserId, currentUserId]
      await queryClient.cancelQueries({ queryKey })
      const previousPosts = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: ProfilePost[] | undefined) =>
        (old ?? []).map(p =>
          p.id === postId
            ? { ...p, user_liked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
            : p
        )
      )
      return { previousPosts }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['profile', 'posts', profileUserId, currentUserId], context.previousPosts)
      }
    },
  })
}

// ─── Followers / Following lists (cached) ────────────────────────────────────

async function fetchFollowersList(profileUserId: string, currentUserId: string | null) {
  const { data: followsData, error } = await supabase
    .from('follows')
    .select(`follower_id, follower:profiles!follower_id (id, username, full_name, avatar_url, avatar_crop, bio)`)
    .eq('following_id', profileUserId)
    .limit(100)
  if (error) throw error

  const profiles = (followsData ?? []).map((f: any) => f.follower).filter(Boolean)
  if (!currentUserId || profiles.length === 0) return profiles.map((p: any) => ({ ...p, isFollowing: false }))

  const ids = profiles.map((p: any) => p.id)
  const { data: myFollows } = await supabase
    .from('follows').select('following_id').eq('follower_id', currentUserId).in('following_id', ids)
  const myFollowsSet = new Set(myFollows?.map((f: any) => f.following_id))
  return profiles.map((p: any) => ({ ...p, isFollowing: myFollowsSet.has(p.id) }))
}

async function fetchFollowingList(profileUserId: string, currentUserId: string | null) {
  const { data: followsData, error } = await supabase
    .from('follows')
    .select(`following_id, following:profiles!following_id (id, username, full_name, avatar_url, avatar_crop, bio)`)
    .eq('follower_id', profileUserId)
    .limit(100)
  if (error) throw error

  const profiles = (followsData ?? []).map((f: any) => f.following).filter(Boolean)
  if (!currentUserId || profiles.length === 0) return profiles.map((p: any) => ({ ...p, isFollowing: false }))

  const ids = profiles.map((p: any) => p.id)
  const { data: myFollows } = await supabase
    .from('follows').select('following_id').eq('follower_id', currentUserId).in('following_id', ids)
  const myFollowsSet = new Set(myFollows?.map((f: any) => f.following_id))
  return profiles.map((p: any) => ({ ...p, isFollowing: myFollowsSet.has(p.id) }))
}

export function useFollowersList(profileUserId: string | undefined, currentUserId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['profile', 'followers-list', profileUserId, currentUserId],
    queryFn: () => fetchFollowersList(profileUserId!, currentUserId),
    enabled: !!profileUserId && enabled,
    staleTime: 2 * 60 * 1000,
  })
}

export function useFollowingList(profileUserId: string | undefined, currentUserId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['profile', 'following-list', profileUserId, currentUserId],
    queryFn: () => fetchFollowingList(profileUserId!, currentUserId),
    enabled: !!profileUserId && enabled,
    staleTime: 2 * 60 * 1000,
  })
}
