import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SocialUIState {
  feedScrollPos: number
  setFeedScrollPos: (pos: number) => void
  feedVisibleCount: number
  setFeedVisibleCount: (count: number) => void
  // Preserved for PeoplePage UI
  peopleScrollPos: number
  setPeopleScrollPos: (pos: number) => void
  peopleActiveTab: string
  setPeopleActiveTab: (tab: string) => void
}

export const useSocialStore = create<SocialUIState>()(
  persist(
    (set) => ({
      feedScrollPos: 0,
      setFeedScrollPos: (pos) => set({ feedScrollPos: pos }),
      feedVisibleCount: 10,
      setFeedVisibleCount: (count) => set({ feedVisibleCount: count }),
      peopleScrollPos: 0,
      setPeopleScrollPos: (pos) => set({ peopleScrollPos: pos }),
      peopleActiveTab: 'search',
      setPeopleActiveTab: (tab) => set({ peopleActiveTab: tab }),
    }),
    {
      name: 'popcorn-social-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Post type exported for FeedPage and other consumers
export type Post = {
  id: string
  user_id: string
  content: string
  image_url: string | null
  media_entry_id: string | null
  created_at: string
  updated_at?: string | null
  likes_count: number
  comments_count: number
  is_liked: boolean
  profiles: {
    username: string
    avatar_url: string | null
    avatar_crop?: { x: number; y: number; scale: number } | null
    badges?: string[]
  }
  media_entries?: {
    title: string
    media_type: 'movie' | 'show' | 'game' | 'book'
    rating: number | null
    cover_image_url: string | null
  }
}

export type ProfileWithFollowStatus = {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  isFollowing: boolean
  isFollower: boolean
}
