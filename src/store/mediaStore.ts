import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface MediaUIState {
  profileScrollPos: number
  setProfileScrollPos: (pos: number) => void
}

export const useMediaStore = create<MediaUIState>()(
  persist(
    (set) => ({
      profileScrollPos: 0,
      setProfileScrollPos: (pos) => set({ profileScrollPos: pos }),
    }),
    {
      name: 'popcorn-media-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Re-export MediaEntry type since other files import it from here
export type MediaEntry = {
  id: string
  user_id: string
  media_type: 'movie' | 'show' | 'game' | 'book'
  title: string
  rating: number | null
  status: 'completed' | 'in-progress' | 'planned' | 'logged'
  completed_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  genre?: string | null
  year?: number | null
  cover_image_url?: string | null
}

export type UserStats = {
  user_id?: string
  id?: string
  username?: string
  total_entries?: number
  completed_entries?: number
  movies_count: number
  shows_count: number
  games_count: number
  books_count: number
  avg_rating: number | null
  following_count?: number
  followers_count?: number
}
