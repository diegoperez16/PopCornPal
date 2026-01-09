import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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
  entries: MediaEntry[]
  userStats: UserStats | null
  loading: boolean
  error: string | null
  fetchEntries: (userId: string) => Promise<void>
  fetchUserStats: (userId: string) => Promise<void>
  addEntry: (entry: Omit<MediaEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  updateEntry: (id: string, updates: Partial<MediaEntry>) => Promise<void>
}

export const useMediaStore = create<MediaState>((set, get) => ({
  entries: [],
  userStats: null,
  loading: false,
  error: null,

  fetchEntries: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ entries: data as MediaEntry[] })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  fetchUserStats: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', userId)
        .maybeSingle()  // Use maybeSingle to handle 0 rows gracefully

      if (error) {
        console.error('Error fetching stats:', error)
        return
      }
      
      if (!data) {
        console.log('No stats found for user:', userId)
        return
      }

      set({ userStats: data as UserStats })
    } catch (error) {
      console.error('Unexpected error fetching stats:', error)
    }
  },

  addEntry: async (entry) => {
    set({ loading: true, error: null })
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Failed to get session')
      }
      
      if (!session?.user) {
        console.error('No active session')
        throw new Error('User not authenticated. Please sign in again.')
      }

      console.log('Adding entry for user:', session.user.id)

      // If status is completed or in-progress, check if library entry exists
      if (entry.status === 'completed' || entry.status === 'in-progress') {
        const { data: existingLibrary } = await supabase
          .from('media_entries')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('media_type', entry.media_type)
          .eq('title', entry.title)
          .eq('status', 'logged')
          .maybeSingle()

        // If no library entry exists, create one first
        if (!existingLibrary) {
          await supabase
            .from('media_entries')
            .insert([{ 
              media_type: entry.media_type,
              title: entry.title,
              status: 'logged',
              rating: entry.rating,
              notes: entry.notes,
              genre: entry.genre,
              year: entry.year,
              cover_image_url: entry.cover_image_url,
              user_id: session.user.id,
              completed_date: null
            }])
        }
      }

      // Now add the main entry
      const { error } = await supabase
        .from('media_entries')
        .insert([{ ...entry, user_id: session.user.id }])

      if (error) {
        console.error('Insert error:', error)
        throw error
      }
      
      console.log('Entry added successfully')
      
      // Refresh entries and stats
      await get().fetchEntries(session.user.id)
      await get().fetchUserStats(session.user.id)
    } catch (error) {
      console.error('addEntry failed:', error)
      set({ error: (error as Error).message })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  deleteEntry: async (id) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('media_entries')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Optimistically update local state instead of refetching
      const currentEntries = get().entries
      const deletedEntry = currentEntries.find(e => e.id === id)
      const newEntries = currentEntries.filter(e => e.id !== id)
      set({ entries: newEntries })
      
      // Update stats optimistically if we have them
      const currentStats = get().userStats
      if (currentStats && deletedEntry) {
        const typeKey = `${deletedEntry.media_type}s_count` as keyof UserStats
        set({ 
          userStats: {
            ...currentStats,
            [typeKey]: Math.max(0, (currentStats[typeKey] as number) - 1),
            total_entries: Math.max(0, currentStats.total_entries - 1)
          }
        })
      }
    } catch (error) {
      set({ error: (error as Error).message })
      // Refetch on error to ensure consistency
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await get().fetchEntries(user.id)
        await get().fetchUserStats(user.id)
      }
    } finally {
      set({ loading: false })
    }
  },

  updateEntry: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get the entry being updated
      const currentEntry = get().entries.find(e => e.id === id)
      if (!currentEntry) throw new Error('Entry not found')

      // If changing to completed or in-progress, ensure library entry exists
      if (updates.status && (updates.status === 'completed' || updates.status === 'in-progress')) {
        const { data: existingLibrary } = await supabase
          .from('media_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('media_type', currentEntry.media_type)
          .eq('title', currentEntry.title)
          .eq('status', 'logged')
          .maybeSingle()

        // If no library entry exists, create one
        if (!existingLibrary) {
          await supabase
            .from('media_entries')
            .insert([{ 
              media_type: currentEntry.media_type,
              title: currentEntry.title,
              status: 'logged',
              rating: updates.rating ?? currentEntry.rating,
              notes: updates.notes ?? currentEntry.notes,
              genre: currentEntry.genre,
              year: currentEntry.year,
              cover_image_url: currentEntry.cover_image_url,
              user_id: user.id,
              completed_date: null
            }])
        }
      }

      // Now update the main entry
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
  }
}))
