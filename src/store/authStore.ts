import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase, resetSupabaseClient } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  initialize: () => Promise<void>
  resumeSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        
        if (error) console.error('Error setting session:', error)
        else if (data.session?.user) {
          set({ user: data.session.user })
          await get().fetchProfile(data.session.user.id)
          window.history.replaceState({}, document.title, '/feed')
          set({ loading: false })
          return
        }
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        // Only update state if it actually changed
        const currentUser = get().user
        if (session?.user?.id !== currentUser?.id) {
          set({ user: session?.user ?? null })
          if (session?.user) {
            await get().fetchProfile(session.user.id)
          } else {
            set({ profile: null })
          }
        }
      })

      // Initial session check
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ loading: false })
    }
  },

  // New silent check for tab resume
  resumeSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error || !data.session) {
        console.warn('Session invalid on resume, attempting silent refresh...')
        // Don't set global loading=true here to avoid UI flicker
        resetSupabaseClient()
        const { data: refreshData } = await supabase.auth.getSession()
        
        if (refreshData.session?.user) {
          set({ user: refreshData.session.user })
          // Optionally refresh profile if needed
          // await get().fetchProfile(refreshData.session.user.id)
        }
      }
    } catch (err) {
      console.error('Resume session failed', err)
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      set({ user: data.user })
      await get().fetchProfile(data.user.id)
    }
  },

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username }, emailRedirectTo: `${window.location.origin}/auth?confirmed=true` }
    })

    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Failed to create user')

    if (data.user && !data.session) {
      throw new Error('✉️ Please check your email to confirm your account.')
    }

    await supabase.from('profiles').insert({
      id: data.user.id,
      username: username.toLowerCase().trim(),
    })

    set({ user: data.user })
    await get().fetchProfile(data.user.id)
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (data) set({ profile: data })
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    set({ profile: data })
  },
}))