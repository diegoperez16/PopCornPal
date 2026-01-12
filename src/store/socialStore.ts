import { create } from 'zustand'

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
  feedVisibleCount: number // <--- NEW: Store visible count

  // People Data
  followers: ProfileWithFollowStatus[]
  following: ProfileWithFollowStatus[]
  peopleLoaded: boolean
  peopleScrollPos: number

  // Actions
  setFeedPosts: (posts: Post[] | ((prev: Post[]) => Post[])) => void
  setFeedScrollPos: (pos: number) => void
  setFeedVisibleCount: (count: number | ((prev: number) => number)) => void // <--- NEW Action

  setFollowers: (followers: ProfileWithFollowStatus[]) => void
  setFollowing: (following: ProfileWithFollowStatus[]) => void
  setPeopleScrollPos: (pos: number) => void
  
  resetSocialStore: () => void
}

export const useSocialStore = create<SocialState>((set) => ({
  feedPosts: [],
  feedLoaded: false,
  feedScrollPos: 0,
  feedVisibleCount: 5, // <--- NEW: Initialize to 5

  followers: [],
  following: [],
  peopleLoaded: false,
  peopleScrollPos: 0,

  setFeedPosts: (posts) => set((state) => ({ 
    feedPosts: typeof posts === 'function' ? posts(state.feedPosts) : posts,
    feedLoaded: true 
  })),
  setFeedScrollPos: (pos) => set({ feedScrollPos: pos }),
  
  // <--- NEW: Setter logic (supports functional updates like prev => prev + 10)
  setFeedVisibleCount: (count) => set((state) => ({
    feedVisibleCount: typeof count === 'function' ? count(state.feedVisibleCount) : count
  })),

  setFollowers: (followers) => set({ followers, peopleLoaded: true }),
  setFollowing: (following) => set({ following, peopleLoaded: true }),
  setPeopleScrollPos: (pos) => set({ peopleScrollPos: pos }),
  
  resetSocialStore: () => set({ 
    feedPosts: [], 
    feedLoaded: false, 
    feedScrollPos: 0,
    feedVisibleCount: 5, // <--- Reset to 5 on logout
    followers: [], 
    following: [], 
    peopleLoaded: false,
    peopleScrollPos: 0
  })
}))