import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type UserBadge, type BackgroundCrop } from '../lib/supabase'
import {
  useUserProfile,
  useUserPosts,
  useUserRecentActivity,
  useFollowUserProfile,
  useToggleUserPostLike,
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

  // Modal States
  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followersList, setFollowersList] = useState<any[]>([])
  const [followingList, setFollowingList] = useState<any[]>([])
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [libraryFilterType, setLibraryFilterType] = useState<'movie' | 'show' | 'game' | 'book' | null>(null)

  // Inspection State
  const [inspectedEntry, setInspectedEntry] = useState<MediaEntry | null>(null)

  // Background crop: track viewport size
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Full library (loaded lazily when modal opens)
  const [fullLibrary, setFullLibrary] = useState<MediaEntry[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  // Followers / following list loading states
  const [followersListLoading, setFollowersListLoading] = useState(false)
  const [followingListLoading, setFollowingListLoading] = useState(false)

  // ─── Derived loading states (mapped from TQ) ─────────────────────────────────

  // initialLoading: true until the profile itself resolves for the first time
  const initialLoading = profileQuery.isLoading

  // loading: true while any background refetch is in progress
  const loading = profileQuery.isFetching || postsQuery.isFetching || recentActivityQuery.isFetching

  // postsLoaded / recentActivityLoaded: analogous to the old boolean flags
  const postsLoaded = postsQuery.isSuccess
  const recentActivityLoaded = recentActivityQuery.isSuccess

  // followLoading: tracked via mutation status
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
      const updateList = (list: any[]) => list.map(user =>
        user.id === targetUserId ? { ...user, isFollowing: !isCurrentlyFollowing } : user
      )
      if (listType === 'followers') setFollowersList(prev => updateList(prev))
      if (listType === 'following') setFollowingList(prev => updateList(prev))
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const navigateToProfile = (targetUsername: string) => {
    const userFromFollowers = followersList.find(u => u.username === targetUsername)
    const userFromFollowing = followingList.find(u => u.username === targetUsername)
    const optimisticProfile = userFromFollowers || userFromFollowing
    setShowFollowersModal(false)
    setShowFollowingModal(false)
    navigate(`/profile/${targetUsername}`, { state: { initialProfile: optimisticProfile } })
  }

  // Library is still fetched directly (no TQ hook exists for this yet)
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

  // Trigger lazy full-library load when modal opens
  useEffect(() => {
    if (showLibraryModal && fullLibrary.length === 0 && profileUserId && !libraryLoading) {
      fetchFullLibrary()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLibraryModal, profileUserId])

  const fetchFollowersList = async () => {
    if (!profileUserId) return
    setFollowersListLoading(true)
    try {
      await supabase.auth.getSession()
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`follower_id, follower:profiles!follower_id (id, username, full_name, avatar_url, bio)`)
        .eq('following_id', profileUserId)
        .limit(100)
      if (followsError) throw followsError
      if (!followsData || followsData.length === 0) { setFollowersList([]); return }
      const profiles = followsData.map(f => f.follower).filter(Boolean) as any[]
      const ids = profiles.map(p => p.id)
      let followersWithStatus = profiles.map(p => ({ ...p, isFollowing: false }))
      if (currentUser) {
        const { data: myFollows } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id).in('following_id', ids)
        const myFollowsSet = new Set(myFollows?.map(f => f.following_id))
        followersWithStatus = followersWithStatus.map(p => ({ ...p, isFollowing: myFollowsSet.has(p.id) }))
      }
      setFollowersList(followersWithStatus)
    } catch (error) {
      console.error('Error fetching followers list:', error)
    } finally {
      setFollowersListLoading(false)
    }
  }

  const fetchFollowingList = async () => {
    if (!profileUserId) return
    setFollowingListLoading(true)
    try {
      await supabase.auth.getSession()
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`following_id, following:profiles!following_id (id, username, full_name, avatar_url, bio)`)
        .eq('follower_id', profileUserId)
        .limit(100)
      if (followsError) throw followsError
      if (!followsData || followsData.length === 0) { setFollowingList([]); return }
      const profiles = followsData.map(f => f.following).filter(Boolean) as any[]
      const ids = profiles.map(p => p.id)
      let followingWithStatus = profiles.map(p => ({ ...p, isFollowing: false }))
      if (currentUser) {
        const { data: myFollows } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id).in('following_id', ids)
        const myFollowsSet = new Set(myFollows?.map(f => f.following_id))
        followingWithStatus = followingWithStatus.map(p => ({ ...p, isFollowing: myFollowsSet.has(p.id) }))
      }
      setFollowingList(followingWithStatus)
    } catch (error) {
      console.error('Error fetching following list:', error)
    } finally {
      setFollowingListLoading(false)
    }
  }

  // Trigger followers/following list fetch when their modals open
  useEffect(() => {
    if (showFollowersModal && profileUserId) {
      fetchFollowersList()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFollowersModal, profileUserId, currentUserId])

  useEffect(() => {
    if (showFollowingModal && profileUserId) {
      fetchFollowingList()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFollowingModal, profileUserId, currentUserId])

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

  // Badge logic
  const creatorBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'creator')
  const alphaBadge = userBadges.find(ub => ub.badges?.name.toLowerCase() === 'alpha tester')
  const regularBadges = userBadges.filter(ub => {
    const name = ub.badges?.name.toLowerCase()
    return name !== 'creator' && name !== 'alpha tester'
  })

  const isOwnProfile = profile ? currentUser?.id === profile.id : false

  return {
    // State
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
    // Computed
    creatorBadge,
    alphaBadge,
    regularBadges,
    isOwnProfile,
    // Handlers
    handleFollow,
    handleLike,
    handleFollowUser,
    navigateToProfile,
    getFilteredLibrary,
    navigate,
  }
}
