import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase, type UserBadge, type BackgroundCrop } from '../lib/supabase'

// --- TYPES ---
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

export type MediaEntry = {
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
  media_entry: MediaEntry
}

export function useUserProfilePage(
  username: string | undefined,
  currentUser: { id: string } | null
) {
  const navigate = useNavigate()
  const location = useLocation()

  // Profile Data
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const initialProfile = location.state?.initialProfile
    if (initialProfile && initialProfile.username === username) {
      return {
        id: initialProfile.id,
        username: initialProfile.username,
        full_name: initialProfile.full_name || null,
        bio: initialProfile.bio || null,
        avatar_url: initialProfile.avatar_url || null,
        bg_url: null,
        bg_opacity: null,
        created_at: new Date().toISOString()
      }
    }
    return null
  })
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [posts, setPosts] = useState<Post[]>([])

  // Social Data
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)

  // Media Data
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [recentActivity, setRecentActivity] = useState<MediaEntry[]>([])
  const [fullLibrary, setFullLibrary] = useState<MediaEntry[]>([])

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

  // Loading States
  const [initialLoading, setInitialLoading] = useState(!profile)
  const [loading, setLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [followersListLoading, setFollowersListLoading] = useState(false)
  const [followingListLoading, setFollowingListLoading] = useState(false)

  // Lazy Load States
  const [postsLoaded, setPostsLoaded] = useState(false)
  const [recentActivityLoaded, setRecentActivityLoaded] = useState(false)

  useEffect(() => {
    if (username) {
      if (!profile || profile.username !== username) {
        setInitialLoading(true)
      }
      fetchUserProfile().finally(() => setInitialLoading(false))
    }
  }, [username])

  useEffect(() => {
    if (showLibraryModal && fullLibrary.length === 0 && profile) {
      fetchFullLibrary()
    }
  }, [showLibraryModal])

  useEffect(() => {
    if (showFollowersModal && profile) {
      fetchFollowersList()
    }
  }, [showFollowersModal, profile?.id, currentUser?.id])

  useEffect(() => {
    if (showFollowingModal && profile) {
      fetchFollowingList()
    }
  }, [showFollowingModal, profile?.id, currentUser?.id])

  const fetchFullLibrary = async () => {
    if (!profile) return
    setLibraryLoading(true)
    try {
      const { data, error } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setFullLibrary(data as MediaEntry[])
    } catch (error) {
      console.error('Error fetching library:', error)
    } finally {
      setLibraryLoading(false)
    }
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
        user.id === targetUserId
          ? { ...user, isFollowing: !isCurrentlyFollowing }
          : user
      )

      if (listType === 'followers') setFollowersList(updateList(followersList))
      if (listType === 'following') setFollowingList(updateList(followingList))

      if (targetUserId === profile?.id) {
        setIsFollowing(!isCurrentlyFollowing)
        setFollowersCount(prev => isCurrentlyFollowing ? prev - 1 : prev + 1)
      }
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
    navigate(`/profile/${targetUsername}`, {
      state: { initialProfile: optimisticProfile }
    })
  }

  const fetchFollowersList = async () => {
    if (!profile) return
    setFollowersListLoading(true)
    try {
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          follower:profiles!follower_id (id, username, full_name, avatar_url, bio)
        `)
        .eq('following_id', profile.id)
        .limit(100)

      if (followsError) throw followsError

      if (!followsData || followsData.length === 0) {
        setFollowersList([])
        return
      }

      const profiles = followsData.map(f => f.follower).filter(Boolean) as any[]
      const ids = profiles.map(p => p.id)

      let followersWithStatus = profiles.map(p => ({ ...p, isFollowing: false }))

      if (currentUser) {
        const { data: myFollows, error: myFollowsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id)
          .in('following_id', ids)

        if (myFollowsError) console.error('Error checking follows:', myFollowsError)

        const myFollowsSet = new Set(myFollows?.map(f => f.following_id))
        followersWithStatus = followersWithStatus.map(p => ({
          ...p,
          isFollowing: myFollowsSet.has(p.id)
        }))
      }

      setFollowersList(followersWithStatus)
    } catch (error) {
      console.error('Error fetching followers list:', error)
    } finally {
      setFollowersListLoading(false)
    }
  }

  const fetchFollowingList = async () => {
    if (!profile) return
    setFollowingListLoading(true)
    try {
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          following_id,
          following:profiles!following_id (id, username, full_name, avatar_url, bio)
        `)
        .eq('follower_id', profile.id)
        .limit(100)

      if (followsError) throw followsError

      if (!followsData || followsData.length === 0) {
        setFollowingList([])
        return
      }

      const profiles = followsData.map(f => f.following).filter(Boolean) as any[]
      const ids = profiles.map(p => p.id)

      let followingWithStatus = profiles.map(p => ({ ...p, isFollowing: false }))

      if (currentUser) {
        const { data: myFollows, error: myFollowsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id)
          .in('following_id', ids)

        if (myFollowsError) console.error('Error checking following status:', myFollowsError)

        const myFollowsSet = new Set(myFollows?.map(f => f.following_id))
        followingWithStatus = followingWithStatus.map(p => ({
          ...p,
          isFollowing: myFollowsSet.has(p.id)
        }))
      }

      setFollowingList(followingWithStatus)
    } catch (error) {
      console.error('Error fetching following list:', error)
    } finally {
      setFollowingListLoading(false)
    }
  }

  const fetchRecentActivity = async (userId?: string) => {
    const targetId = userId || profile?.id
    if (!targetId) return
    try {
      const { data, error } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', targetId)
        .neq('status', 'logged')
        .order('updated_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentActivity(data as MediaEntry[])
      setRecentActivityLoaded(true)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const fetchPosts = async (userId?: string) => {
    const targetId = userId || profile?.id
    if (!targetId) return
    setLoading(true)
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`*, profiles:user_id(username, avatar_url), media_entries:media_entry_id(title, media_type, rating, cover_image_url), likes:post_likes(count), comments:post_comments(count)`)
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (postsError) throw postsError

      const rawPosts = postsData
      const postIds = rawPosts.map(p => p.id)
      const likedPostIds = new Set<string>()

      if (currentUser && postIds.length > 0) {
        const { data: userLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', currentUser.id).in('post_id', postIds)
        if (userLikes) userLikes.forEach(like => likedPostIds.add(like.post_id))
      }

      setPosts(rawPosts.map((post: any) => ({
        ...post,
        likes_count: post.likes?.[0]?.count || 0,
        comments_count: post.comments?.[0]?.count || 0,
        user_liked: likedPostIds.has(post.id)
      })))
      setPostsLoaded(true)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    if (!username) return
    setLoading(true)

    if (!profile || profile.username !== username) {
      const initialProfile = location.state?.initialProfile
      if (initialProfile && initialProfile.username === username) {
        setProfile({
          id: initialProfile.id,
          username: initialProfile.username,
          full_name: initialProfile.full_name || null,
          bio: initialProfile.bio || null,
          avatar_url: initialProfile.avatar_url || null,
          bg_url: null,
          bg_opacity: null,
          created_at: new Date().toISOString()
        })
        setInitialLoading(false)
      } else {
        setProfile(null)
      }
    }

    setFullLibrary([])
    setFollowersList([])
    setFollowingList([])
    setPosts([])
    setRecentActivity([])
    setPostsLoaded(false)
    setRecentActivityLoaded(false)

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      setInitialLoading(false)

      const [
        badgesResult,
        followersResult,
        followingResult,
        currentUserFollowResult,
        favoritesResult
      ] = await Promise.all([
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', profileData.id),
        supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileData.id),
        supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileData.id),
        currentUser ? supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', currentUser.id).eq('following_id', profileData.id) : Promise.resolve({ count: 0, error: null }),
        supabase.from('profile_favorites')
          .select('*, media_entry:media_entries(*)')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: true })
      ])

      if (badgesResult.data) setUserBadges(badgesResult.data as UserBadge[])

      setFollowersCount(followersResult.count ?? 0)
      setFollowingCount(followingResult.count ?? 0)
      setIsFollowing((currentUserFollowResult.count ?? 0) > 0)

      if (favoritesResult.data) setFavorites(favoritesResult.data as any[])

      fetchRecentActivity(profileData.id)
      fetchPosts(profileData.id)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser || !profile || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id)
        setIsFollowing(false); setFollowersCount(prev => prev - 1)
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id })
        setIsFollowing(true); setFollowersCount(prev => prev + 1)
      }
    } catch (error) { console.error(error) }
    finally { setFollowLoading(false) }
  }

  const handleLike = async (postId: string) => {
    if (!currentUser) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    try {
      if (post.user_liked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)
        setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count - 1, user_liked: false } : p))
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser.id })
        setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1, user_liked: true } : p))
      }
    } catch (error) { console.error(error) }
  }

  const getFilteredLibrary = () => {
    let filtered = fullLibrary.filter(e => e.status === 'logged')
    if (libraryFilterType) {
      filtered = filtered.filter(e => e.media_type === libraryFilterType)
    }
    if (librarySearchQuery.trim()) {
      const q = librarySearchQuery.toLowerCase()
      filtered = filtered.filter(e => e.title.toLowerCase().includes(q))
    }
    return filtered
  }

  // --- BADGE LOGIC ---
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
