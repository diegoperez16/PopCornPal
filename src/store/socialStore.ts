import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ... (Post and ProfileWithFollowStatus interfaces remain the same) ...
export interface Post {
  id: string
  user_id: string
  content: string
  media_entry_id: string | null
  image_url: string | null
  created_at: string
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

  resetSocialStore: () => void
}

export const useSocialStore = create<SocialState>((set, get) => ({
  feedPosts: [],
  feedLoaded: false,
  feedScrollPos: 0,
  feedVisibleCount: 5,
  hasMore: true,

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
        
        set({ hasMore: rpcData.length === limit, feedLoaded: true })
        return
      }

      // 2. Fallback to Standard Query
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
          media_entries:media_entry_id (title, media_type, rating, cover_image_url)
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

      const postIds = data.map(p => p.id)
      const { data: allLikes } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds)
      const { data: allComments } = await supabase.from('post_comments').select('post_id').in('post_id', postIds)
      
      const likesMap = new Map()
      const commentsMap = new Map()
      
      postIds.forEach(id => {
        likesMap.set(id, { count: 0, userLiked: false })
        commentsMap.set(id, 0)
      })
      
      allLikes?.forEach((like: any) => {
        const curr = likesMap.get(like.post_id)
        if (curr) {
          curr.count++
          if (like.user_id === userId) curr.userLiked = true
        }
      })
      
      allComments?.forEach((c: any) => {
        commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1)
      })

      const postsWithCounts: Post[] = data.map((post: any) => ({
        ...post,
        likes_count: likesMap.get(post.id)?.count || 0,
        comments_count: commentsMap.get(post.id) || 0,
        is_liked: likesMap.get(post.id)?.userLiked || false
      }))

      if (offset > 0) {
        set((state) => ({ feedPosts: [...state.feedPosts, ...postsWithCounts] }))
      } else {
        set({ feedPosts: postsWithCounts })
      }
      set({ hasMore: data.length === limit, feedLoaded: true })

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

  resetSocialStore: () => set({ 
    feedPosts: [], 
    feedLoaded: false, 
    feedScrollPos: 0,
    feedVisibleCount: 5, // <--- Reset to 5 on logout
    followers: [], 
    following: [], 
    peopleLoaded: false,
    peopleScrollPos: 0,
    peopleActiveTab: 'search'
  })
}))