import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
// Add Badge and UserBadge to imports
import type { Badge, UserBadge } from '../lib/supabase'

const safeLocalStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn('localStorage quota exceeded — clearing media cache', e)
      localStorage.removeItem('popcorn-media')
      try { localStorage.setItem(key, value) } catch { /* give up silently */ }
    }
  },
  removeItem: (key: string) => localStorage.removeItem(key),
}

export interface MediaEntry {
  id: string
  user_id: string
  media_type: 'movie' | 'show' | 'game' | 'book'
  title: string
  rating: number | null
  status: 'completed' | 'in-progress' | 'planned' | 'logged'
  completed_date: string | null
  notes: string | null
  genre: string | null
  year: number | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface UserStats {
  id: string
  username: string
  movies_count: number
  shows_count: number
  games_count: number
  books_count: number
  total_entries: number
  avg_rating: number | null
  following_count: number
  followers_count: number
}

interface MediaState {
  // ... existing entries ...
  entries: MediaEntry[]
  userStats: UserStats | null
  loading: boolean
  error: string | null

  // --- NEW: Profile Caching State ---
  favorites: any[]
  userBadges: UserBadge[]
  availableBadges: Badge[]
  profileLoaded: boolean
  profileScrollPos: number
  entriesLastFetched: number

  // ... existing actions ...
  fetchEntries: (userId: string, force?: boolean) => Promise<void>
  fetchUserStats: (userId: string) => Promise<void>
  addEntry: (entry: Omit<MediaEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  updateEntry: (id: string, updates: Partial<MediaEntry>) => Promise<void>

  // --- NEW: Profile Actions ---
  setFavorites: (favorites: any[]) => void
  setUserBadges: (badges: UserBadge[]) => void
  setAvailableBadges: (badges: Badge[]) => void
  setProfileLoaded: (loaded: boolean) => void
  setProfileScrollPos: (pos: number) => void
  resetMediaStore: () => void
}

export const useMediaStore = create<MediaState>()(
  persist(
  (set, get) => ({
  entries: [],
  userStats: null,
  loading: false,
  error: null,

  favorites: [],
  userBadges: [],
  availableBadges: [],
  profileLoaded: false,
  profileScrollPos: 0,
  entriesLastFetched: 0,

  fetchEntries: async (userId: string, force = false) => {
    const { entriesLastFetched } = get()
    const STALE_MS = 5 * 60 * 1000 // 5 minutes
    if (!force && entriesLastFetched && Date.now() - entriesLastFetched < STALE_MS) return

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ entries: data as MediaEntry[], entriesLastFetched: Date.now() })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  fetchUserStats: async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) set({ userStats: data as UserStats })
    } catch (error) {
      console.error('Unexpected error fetching stats:', error)
    }
  },

  addEntry: async (entry) => {
    set({ loading: true, error: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('User not authenticated')

      // Handle library persistence for completed/in-progress items
      if (entry.status === 'completed' || entry.status === 'in-progress') {
        const { data: existingLibrary } = await supabase
          .from('media_entries')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('media_type', entry.media_type)
          .eq('title', entry.title)
          .eq('status', 'logged')
          .maybeSingle()

        if (!existingLibrary) {
          await supabase.from('media_entries').insert([{ 
            ...entry, status: 'logged', user_id: session.user.id, completed_date: null
          }])
        }
      }

      const { error } = await supabase
        .from('media_entries')
        .insert([{ ...entry, user_id: session.user.id }])

      if (error) throw error
      
      await get().fetchEntries(session.user.id)
      await get().fetchUserStats(session.user.id)
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  deleteEntry: async (id) => {
    set({ loading: true })
    try {
      const { error } = await supabase.from('media_entries').delete().eq('id', id)
      if (error) throw error
      
      // Optimistic update
      const currentEntries = get().entries
      set({ entries: currentEntries.filter(e => e.id !== id) })
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await get().fetchUserStats(user.id)
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  updateEntry: async (id, updates) => {
    set({ loading: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('media_entries')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await get().fetchEntries(user.id)
      await get().fetchUserStats(user.id)
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  // --- NEW: Implement Actions ---
  setFavorites: (favorites) => set({ favorites }),
  setUserBadges: (userBadges) => set({ userBadges }),
  setAvailableBadges: (availableBadges) => set({ availableBadges }),
  setProfileLoaded: (profileLoaded) => set({ profileLoaded }),
  setProfileScrollPos: (profileScrollPos) => set({ profileScrollPos }),

  resetMediaStore: () => set({
    entries: [],
    userStats: null,
    favorites: [],
    userBadges: [],
    availableBadges: [],
    profileLoaded: false,
    profileScrollPos: 0,
    entriesLastFetched: 0,
  }),
  }),
  {
    name: 'popcorn-media',
    storage: createJSONStorage(() => safeLocalStorage),
    partialize: (state) => ({
      entries: state.entries,
      favorites: state.favorites,
      userBadges: state.userBadges,
      availableBadges: state.availableBadges,
      profileLoaded: state.profileLoaded,
      profileScrollPos: state.profileScrollPos,
      entriesLastFetched: state.entriesLastFetched,
    }),
  }
))