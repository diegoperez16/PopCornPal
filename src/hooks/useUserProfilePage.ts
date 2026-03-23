import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, type UserBadge, type BackgroundCrop } from '../lib/supabase'
import {
  useUserProfile,
  useUserPosts,
  useUserRecentActivity,
  useFollowUserProfile,
  useToggleUserPostLike,
  useFollowersList,
  useFollowingList,
} from './queries/useProfileQueries'
import type { ProfileMediaEntry } from './queries/useProfileQueries'

// --- TYPES ---
// Re-export compatible type aliases so callers (UserProfilePage.tsx) keep working
export type UserProfile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  avatar_crop?: { x: number; y: number; scale: number } | null
  bg_url: string | null
  bg_opacity: number | null
  bg_crop?: BackgroundCrop | null
  created_at: string
}

export type Post = {
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

export type MediaEntry = ProfileMediaEntry

export type Favorite = {
  id: string
  media_entry: MediaEntry
}

export function useUserProfilePage(
  username: string | undefined,
  currentUser: { id: string } | null
) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const currentUserId = currentUser?.id ?? null

  // ─── TanStack Query hooks ────────────────────────────────────────────────────

  const profileQuery = useUserProfile(username, currentUserId)
  const profileData = profileQuery.data

  const profileUserId = profileData?.profile?.id

  const postsQuery = useUserPosts(profileUserId, currentUserId)
  const recentActivityQuery = useUserRecentActivity(profileUserId)

  const followMutation = useFollowUserProfile(currentUserId)
  const likeMutation = useToggleUserPostLike(currentUserId, profileUserId)

  // ─── Local UI state ───────────────────────────────────────────────────────────

  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [libraryFilterType, setLibraryFilterType] = useState<'movie' | 'show' | 'game' | 'book' | null>(null)
  const [inspectedEntry, setInspectedEntry] = useState<MediaEntry | null>(null)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Full library (loaded lazily when modal opens)
  const [fullLibrary, setFullLibrary] = useState<MediaEntry[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  // ─── Cached followers/following via TanStack Query ────────────────────────────

  const followersQuery = useFollowersList(profileUserId, currentUserId, showFollowersModal)
  const followingQuery = useFollowingList(profileUserId, currentUserId, showFollowingModal)

  const followersList = followersQuery.data ?? []
  const followingList = followingQuery.data ?? []
  const followersListLoading = followersQuery.isFetching
  const followingListLoading = followingQuery.isFetching

  // ─── Derived loading states ───────────────────────────────────────────────────

  const initialLoading = profileQuery.isLoading
  const loading = profileQuery.isFetching || postsQuery.isFetching || recentActivityQuery.isFetching
  const postsLoaded = postsQuery.isSuccess
  const recentActivityLoaded = recentActivityQuery.isSuccess
  const followLoading = followMutation.isPending

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleFollow = () => {
    if (!currentUser || !profileData?.profile || followLoading) return
    followMutation.mutate({
      targetUserId: profileData.profile.id,
      isCurrentlyFollowing: profileData.isFollowing,
      username: profileData.profile.username,
    })
  }

  const handleLike = (postId: string) => {
    if (!currentUser) return
    const post = (postsQuery.data ?? []).find(p => p.id === postId)
    if (!post) return
    likeMutation.mutate({ postId, isLiked: post.user_liked })
  }

  const handleFollowUser = async (targetUserId: string, isCurrentlyFollowing: boolean, listType: 'followers' | 'following') => {
    if (!currentUser) return
    try {
      if (isCurrentlyFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', targetUserId)
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetUserId })
      }
      // Optimistically update the cached list
      const updateList = (list: any[]) => list.map(u =>
        u.id === targetUserId ? { ...u, isFollowing: !isCurrentlyFollowing } : u
      )
      if (listType === 'followers') {
        queryClient.setQueryData(
          ['profile', 'followers-list', profileUserId, currentUserId],
          (old: any[]) => old ? updateList(old) : old
        )
      } else {
        queryClient.setQueryData(
          ['profile', 'following-list', profileUserId, currentUserId],
          (old: any[]) => old ? updateList(old) : old
        )
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const navigateToProfile = (targetUsername: string) => {
    const optimisticProfile =
      followersList.find((u: any) => u.username === targetUsername) ||
      followingList.find((u: any) => u.username === targetUsername)
    setShowFollowersModal(false)
    setShowFollowingModal(false)
    navigate(`/profile/${targetUsername}`, { state: { initialProfile: optimisticProfile } })
  }

  const fetchFullLibrary = async () => {
    if (!profileUserId) return
    setLibraryLoading(true)
    try {
      await supabase.auth.getSession()
      const { data, error } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', profileUserId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      setFullLibrary(data as MediaEntry[])
    } catch (error) {
      console.error('Error fetching library:', error)
    } finally {
      setLibraryLoading(false)
    }
  }

  useEffect(() => {
    if (showLibraryModal && fullLibrary.length === 0 && profileUserId && !libraryLoading) {
      fetchFullLibrary()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLibraryModal, profileUserId])

  const getFilteredLibrary = () => {
    let filtered = fullLibrary.filter(e => e.status === 'logged')
    if (libraryFilterType) filtered = filtered.filter(e => e.media_type === libraryFilterType)
    if (librarySearchQuery.trim()) {
      const q = librarySearchQuery.toLowerCase()
      filtered = filtered.filter(e => e.title.toLowerCase().includes(q))
    }
    return filtered
  }

  // ─── Derived data from TQ queries ────────────────────────────────────────────

  const profile = (profileData?.profile ?? null) as UserProfile | null
  const userBadges = (profileData?.userBadges ?? []) as UserBadge[]
  const followersCount = profileData?.followersCount ?? 0
  const followingCount = profileData?.followingCount ?? 0
  const isFollowing = profileData?.isFollowing ?? false
  const favorites = (profileData?.favorites ?? []) as Favorite[]
  const posts = (postsQuery.data ?? []) as Post[]
  const recentActivity = (recentActivityQuery.data ?? []) as MediaEntry[]

  const creatorBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'creator')
  const alphaBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'alpha tester')
  const regularBadges = userBadges.filter(ub => {
    const name = ub.badges?.name.toLowerCase()
    return name !== 'creator' && name !== 'alpha tester'
  })

  const isOwnProfile = profile ? currentUser?.id === profile.id : false

  return {
    profile,
    userBadges,
    posts,
    followersCount,
    followingCount,
    isFollowing,
    favorites,
    recentActivity,
    fullLibrary,
    showLibraryModal,
    setShowLibraryModal,
    showFollowersModal,
    setShowFollowersModal,
    showFollowingModal,
    setShowFollowingModal,
    followersList,
    followingList,
    librarySearchQuery,
    setLibrarySearchQuery,
    libraryFilterType,
    setLibraryFilterType,
    inspectedEntry,
    setInspectedEntry,
    isDesktop,
    initialLoading,
    loading,
    followLoading,
    libraryLoading,
    followersListLoading,
    followingListLoading,
    postsLoaded,
    recentActivityLoaded,
    creatorBadge,
    alphaBadge,
    regularBadges,
    isOwnProfile,
    handleFollow,
    handleLike,
    handleFollowUser,
    navigateToProfile,
    getFilteredLibrary,
    navigate,
  }
}
