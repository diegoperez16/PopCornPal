import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// Wraps localStorage so a QuotaExceededError never crashes the app
const safeLocalStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn('localStorage quota exceeded — clearing feed cache', e)
      // Free up space by removing the biggest cache key, then retry once
      localStorage.removeItem('popcorn-social')
      try { localStorage.setItem(key, value) } catch { /* give up silently */ }
    }
  },
  removeItem: (key: string) => localStorage.removeItem(key),
}

// ... (Post and ProfileWithFollowStatus interfaces remain the same) ...
export interface Post {
  id: string
  user_id: string
  content: string
  media_entry_id: string | null
  image_url: string | null
  created_at: string
  updated_at?: string | null
  profiles: {
    username: string
    avatar_url: string | null
  }
  media_entries?: {
    title: string
    media_type: 'movie' | 'show' | 'game' | 'book'
    rating: number
    cover_image_url: string | null
  }
  likes_count: number
  comments_count: number
  is_liked: boolean
}

export interface ProfileWithFollowStatus {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  isFollowing: boolean
  isFollower: boolean
}

interface SocialState {
  // Feed Data
  feedPosts: Post[]
  feedLoaded: boolean
  feedScrollPos: number
  feedVisibleCount: number
  hasMore: boolean
  feedLastFetched: number

  // People Data
  followers: ProfileWithFollowStatus[]
  following: ProfileWithFollowStatus[]
  peopleLoaded: boolean
  peopleScrollPos: number
  peopleActiveTab: string
  followersCount: number
  followingCount: number

  // Actions
  setFeedPosts: (posts: Post[] | ((prev: Post[]) => Post[])) => void
  setFeedScrollPos: (pos: number) => void
  setFeedVisibleCount: (count: number | ((prev: number) => number)) => void
  setHasMore: (hasMore: boolean) => void

  fetchFeed: (userId: string, limit?: number, offset?: number) => Promise<void>

  fetchFollowers: (userId: string, limit?: number, offset?: number) => Promise<void>
  fetchFollowing: (userId: string, limit?: number, offset?: number) => Promise<void>
  
  fetchPeopleCounts: (userId: string) => Promise<void>

  setFollowers: (followers: ProfileWithFollowStatus[]) => void
  setFollowing: (following: ProfileWithFollowStatus[]) => void
  setPeopleScrollPos: (pos: number) => void
  setPeopleActiveTab: (tab: any) => void
  
  toggleLike: (postId: string, userId: string) => Promise<void>
  subscribeToFeed: (userId: string) => void
  unsubscribeFromFeed: () => void

  resetSocialStore: () => void
}

// Lives outside the store so it doesn't trigger re-renders
let feedChannel: RealtimeChannel | null = null
let feedRetryCount = 0
let feedRetryTimer: ReturnType<typeof setTimeout> | null = null
const FEED_MAX_RETRIES = 3

export const useSocialStore = create<SocialState>()(
  persist(
  (set, get) => ({
  feedPosts: [],
  feedLoaded: false,
  feedScrollPos: 0,
  feedVisibleCount: 5,
  hasMore: true,
  feedLastFetched: 0,

  followers: [],
  following: [],
  peopleLoaded: false,
  peopleScrollPos: 0,
  peopleActiveTab: 'search',
  followersCount: 0,
  followingCount: 0,

  setFeedPosts: (posts) => set((state) => ({ 
    feedPosts: typeof posts === 'function' ? posts(state.feedPosts) : posts,
    feedLoaded: true 
  })),
  setFeedScrollPos: (pos) => set({ feedScrollPos: pos }),
  setFeedVisibleCount: (count) => set((state) => ({
    feedVisibleCount: typeof count === 'function' ? count(state.feedVisibleCount) : count
  })),
  setHasMore: (hasMore) => set({ hasMore }),

  fetchFeed: async (userId: string, limit = 5, offset = 0) => {
    try {
      // 1. Try Optimized RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_feed', { 
          p_user_id: userId, 
          p_limit: limit, 
          p_offset: offset 
      })

      if (!rpcError && rpcData) {
        const formattedPosts: Post[] = (rpcData as any[]).map(p => ({
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          media_entry_id: p.media_entry_id,
          image_url: p.image_url,
          created_at: p.created_at,
          updated_at: p.updated_at ?? null,
          profiles: {
            username: p.username,
            avatar_url: p.avatar_url
          },
          media_entries: p.media_title ? {
            title: p.media_title,
            media_type: p.media_type,
            rating: p.media_rating,
            cover_image_url: p.media_cover_url
          } : undefined,
          likes_count: parseInt(p.likes_count) || 0,
          comments_count: parseInt(p.comments_count) || 0,
          is_liked: p.is_liked
        }))

        if (offset > 0) {
          set((state) => ({ feedPosts: [...state.feedPosts, ...formattedPosts] }))
        } else {
          set({ feedPosts: formattedPosts })
        }
        
        set({ hasMore: rpcData.length === limit, feedLoaded: true, feedLastFetched: Date.now() })
        return
      }

      // Network/timeout error — skip fallback (it would fail too) and bail out fast
      const isNetworkError = rpcError && (
        rpcError.message?.toLowerCase().includes('abort') ||
        rpcError.message?.toLowerCase().includes('fetch') ||
        rpcError.message?.toLowerCase().includes('network') ||
        rpcError.message?.toLowerCase().includes('failed')
      )
      if (isNetworkError) {
        console.warn('fetchFeed: network error, skipping fallback')
        return
      }

      // 2. Fallback to Standard Query (RPC not found / misconfigured)
      console.warn('RPC fetch failed, using fallback query', rpcError)
      
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
      
      const followingIds = followingData?.map(f => f.following_id) || []
      const limitedFollowingIds = followingIds.length > 50 ? followingIds.slice(0, 50) : followingIds
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          media_entries:media_entry_id (title, media_type, rating, cover_image_url),
          likes_count:post_likes(count),
          comments_count:post_comments(count)
        `)
        .in('user_id', [...limitedFollowingIds, userId])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      if (!data || data.length === 0) {
        if (offset === 0) set({ feedPosts: [] })
        set({ hasMore: false, feedLoaded: true })
        return
      }

      const postIds = data.map((p: any) => p.id)

      // Single query for this user's likes on these posts (to get is_liked)
      const { data: userLikes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds)

      const likedSet = new Set(userLikes?.map((l: any) => l.post_id))

      const postsWithCounts: Post[] = data.map((post: any) => ({
        ...post,
        likes_count: post.likes_count?.[0]?.count ?? 0,
        comments_count: post.comments_count?.[0]?.count ?? 0,
        is_liked: likedSet.has(post.id)
      }))

      if (offset > 0) {
        set((state) => ({ feedPosts: [...state.feedPosts, ...postsWithCounts] }))
      } else {
        set({ feedPosts: postsWithCounts })
      }
      set({ hasMore: data.length === limit, feedLoaded: true, feedLastFetched: Date.now() })

    } catch (error) {
      console.error('Error fetching feed:', error)
    }
  },

  fetchPeopleCounts: async (userId: string) => {
    try {
      const [followersResult, followingResult] = await Promise.all([
        supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId)
      ])
      
      set({ 
        followersCount: followersResult.count ?? 0,
        followingCount: followingResult.count ?? 0
      })
    } catch (error) {
      console.error('Error fetching people counts:', error)
    }
  },

  fetchFollowers: async (userId: string, limit = 20, offset = 0) => {
    try {
      // 1. Get Followers + Profiles (Joined)
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          follower_id,
          follower:profiles!follower_id (id, username, avatar_url, bio)
        `)
        .eq('following_id', userId)
        .range(offset, offset + limit - 1)

      if (followsError) throw followsError

      if (!followsData || followsData.length === 0) {
        if (offset === 0) set({ followers: [], peopleLoaded: true })
        return
      }

      const profiles = followsData.map(f => f.follower).filter(Boolean) as any[]
      const followerIds = profiles.map(p => p.id)

      // 2. Check which followers we follow back
      const { data: myFollowingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', followerIds)

      const myFollowingSet = new Set(myFollowingData?.map(f => f.following_id))

      const newFollowers = profiles.map(profile => ({
        ...profile,
        isFollowing: myFollowingSet.has(profile.id),
        isFollower: true
      }))

      if (offset > 0) {
        set((state) => ({
          followers: [...state.followers, ...newFollowers],
          peopleLoaded: true
        }))
      } else {
        set({
          followers: newFollowers,
          peopleLoaded: true
        })
      }
    } catch (error) {
      console.error('Error fetching followers:', error)
      // Always mark loaded so the skeleton doesn't stay forever on network errors
      if (get().followers.length === 0) set({ peopleLoaded: true })
    }
  },

  fetchFollowing: async (userId: string, limit = 20, offset = 0) => {
    try {
      // 1. Get Following + Profiles (Joined)
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          following_id,
          following:profiles!following_id (id, username, avatar_url, bio)
        `)
        .eq('follower_id', userId)
        .range(offset, offset + limit - 1)

      if (followsError) throw followsError

      if (!followsData || followsData.length === 0) {
        if (offset === 0) set({ following: [], peopleLoaded: true })
        return
      }

      const profiles = followsData.map(f => f.following).filter(Boolean) as any[]
      const followingIds = profiles.map(p => p.id)

      // 2. Check which people we follow also follow us back
      const { data: theirFollowingData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId)
        .in('follower_id', followingIds)

      const theirFollowingSet = new Set(theirFollowingData?.map(f => f.follower_id))

      const newFollowing = profiles.map(profile => ({
        ...profile,
        isFollowing: true,
        isFollower: theirFollowingSet.has(profile.id)
      }))

      if (offset > 0) {
        set((state) => ({
          following: [...state.following, ...newFollowing],
          peopleLoaded: true
        }))
      } else {
        set({
          following: newFollowing,
          peopleLoaded: true
        })
      }
    } catch (error) {
      console.error('Error fetching following:', error)
      // Always mark loaded so the skeleton doesn't stay forever on network errors
      if (get().following.length === 0) set({ peopleLoaded: true })
    }
  },

  setFollowers: (followers) => set({ followers, peopleLoaded: true }),
  setFollowing: (following) => set({ following, peopleLoaded: true }),
  setPeopleScrollPos: (pos) => set({ peopleScrollPos: pos }),
  setPeopleActiveTab: (tab: any) => set({ peopleActiveTab: tab }),
  
  toggleLike: async (postId: string, userId: string) => {
    const { feedPosts } = get()
    const post = feedPosts.find(p => p.id === postId)
    if (!post) return

    const wasLiked = post.is_liked
    
    // 1. Optimistic Update
    set((state) => ({
      feedPosts: state.feedPosts.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              is_liked: !p.is_liked,
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
            }
          : p
      )
    }))

    try {
      // 2. Network Request
      if (wasLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          
        if (error) throw error
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: userId })
          
        if (error) throw error
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      // 3. Revert on Error
      set((state) => ({
        feedPosts: state.feedPosts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                is_liked: wasLiked,
                likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1
              }
            : p
        )
      }))
    }
  },

  subscribeToFeed: (userId: string) => {
    if (feedChannel) {
      feedChannel.unsubscribe()
      feedChannel = null
    }
    if (feedRetryTimer) {
      clearTimeout(feedRetryTimer)
      feedRetryTimer = null
    }
    feedRetryCount = 0

    const connect = () => {
      try {
        const handlePostChange = async (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          if (eventType === 'INSERT') {
            const postUserId = newRecord.user_id
            const isOwnPost = postUserId === userId
            let shouldInclude = isOwnPost

            if (!shouldInclude) {
              const { data: followData } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', userId)
                .eq('following_id', postUserId)
                .maybeSingle()
              shouldInclude = !!followData
            }
            if (!shouldInclude) return

            const { data: fullPost } = await supabase
              .from('posts')
              .select(`*, profiles:user_id (username, avatar_url), media_entries:media_entry_id (title, media_type, rating, cover_image_url)`)
              .eq('id', newRecord.id)
              .maybeSingle()
            if (!fullPost) return

            const post: Post = { ...fullPost, likes_count: 0, comments_count: 0, is_liked: false }
            set((state) => ({ feedPosts: [post, ...state.feedPosts] }))

          } else if (eventType === 'DELETE') {
            set((state) => ({ feedPosts: state.feedPosts.filter(p => p.id !== oldRecord.id) }))

          } else if (eventType === 'UPDATE') {
            set((state) => ({
              feedPosts: state.feedPosts.map(p =>
                p.id === newRecord.id
                  ? { ...p, content: newRecord.content, image_url: newRecord.image_url }
                  : p
              )
            }))
          }
        }

        const handleLikeChange = async (payload: any) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          const record = eventType === 'DELETE' ? oldRecord : newRecord
          const postId = record.post_id

          // Use a single query to get count + whether the current user liked it,
          // instead of two separate round-trips. Then update only the affected post
          // using findIndex — avoids mapping the entire array on every like event.
          const { data: likesData } = await supabase
            .from('post_likes')
            .select('user_id')
            .eq('post_id', postId)

          if (!likesData) return

          const count = likesData.length
          const isLiked = likesData.some(l => l.user_id === userId)

          set((state) => {
            const index = state.feedPosts.findIndex(p => p.id === postId)
            if (index === -1) return state
            const updated = [...state.feedPosts]
            updated[index] = { ...updated[index], likes_count: count, is_liked: isLiked }
            return { feedPosts: updated }
          })
        }

        feedChannel = supabase
          .channel(`feed-changes-${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, handlePostChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, handleLikeChange)
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              if (feedRetryCount < FEED_MAX_RETRIES) {
                feedRetryCount++
                const delay = Math.pow(2, feedRetryCount) * 2000 // 4s, 8s, 16s
                console.warn(`Feed realtime error — retry ${feedRetryCount}/${FEED_MAX_RETRIES} in ${delay / 1000}s`)
                feedChannel?.unsubscribe()
                feedChannel = null
                feedRetryTimer = setTimeout(connect, delay)
              } else {
                console.warn('Feed realtime unavailable — falling back to TTL-based refresh')
                feedChannel?.unsubscribe()
                feedChannel = null
              }
            } else if (status === 'SUBSCRIBED') {
              feedRetryCount = 0
            }
          })
      } catch (err) {
        console.error('Failed to set up feed realtime subscription:', err)
      }
    }

    connect()
  },

  unsubscribeFromFeed: () => {
    if (feedRetryTimer) {
      clearTimeout(feedRetryTimer)
      feedRetryTimer = null
    }
    if (feedChannel) {
      feedChannel.unsubscribe()
      feedChannel = null
    }
    feedRetryCount = 0
  },

  resetSocialStore: () => set({
    feedPosts: [],
    feedLoaded: false,
    feedScrollPos: 0,
    feedLastFetched: 0,
    feedVisibleCount: 5,
    hasMore: true,
    followers: [],
    following: [],
    peopleLoaded: false,
    peopleScrollPos: 0,
    peopleActiveTab: 'search',
    followersCount: 0,
    followingCount: 0,
  }),
  }),
  {
    name: 'popcorn-social',
    storage: createJSONStorage(() => safeLocalStorage),
    partialize: (state) => ({
      // feedPosts intentionally NOT persisted — too large, refetched via TTL
      feedLoaded: state.feedLoaded,
      feedLastFetched: state.feedLastFetched,
      feedVisibleCount: state.feedVisibleCount,
      feedScrollPos: state.feedScrollPos,
      hasMore: state.hasMore,
      peopleScrollPos: state.peopleScrollPos,
      peopleActiveTab: state.peopleActiveTab,
    }),
  }
))