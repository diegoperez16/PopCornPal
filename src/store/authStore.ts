import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/supabase'

// Set to true while signOut() is running so the SIGNED_OUT listener
// knows it was intentional and doesn't show the "session expired" banner.
let _signingOut = false

const safeLocalStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn('localStorage quota exceeded — clearing auth cache', e)
      localStorage.removeItem('popcorn-auth')
      try { localStorage.setItem(key, value) } catch { /* give up silently */ }
    }
  },
  removeItem: (key: string) => localStorage.removeItem(key),
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  lastAuthCheck: number
  sessionExpired: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  clearSessionExpired: () => void
  resetPasswordForEmail: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  initialize: () => Promise<void>
  resumeSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
  (set, get) => ({
  user: null,
  profile: null,
  loading: false,
  lastAuthCheck: 0,
  sessionExpired: false,

  initialize: async () => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type') // Supabase sends 'recovery' type for password resets
      
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        
        if (error) console.error('Error setting session:', error)
        else if (data.session?.user) {
          set({ user: data.session.user })
          
          // Attempt to fetch profile with timeout
          const fetchProfilePromise = get().fetchProfile(data.session.user.id)
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000))
          await Promise.race([fetchProfilePromise, timeoutPromise])
          
          // Only redirect to feed if we are NOT in recovery/password update mode
          if (type !== 'recovery' && window.location.pathname !== '/update-password') {
            window.history.replaceState({}, document.title, '/feed')
          }
          
          set({ loading: false })
          return
        }
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          set({ user: session?.user ?? null, lastAuthCheck: Date.now() })
          if (session?.user) await get().fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          // Distinguish automatic expiry from manual sign-out so we can show
          // the "session expired" banner only when the user didn't log out themselves.
          set({ user: null, profile: null, lastAuthCheck: 0, sessionExpired: !_signingOut })
        } else {
          const currentUser = get().user
          if (session?.user?.id !== currentUser?.id) {
            set({ user: session?.user ?? null })
            if (session?.user) await get().fetchProfile(session.user.id)
            else set({ profile: null })
          }
        }
      })

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user, lastAuthCheck: Date.now() })
        const fetchProfilePromise = get().fetchProfile(session.user.id)
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000))
        await Promise.race([fetchProfilePromise, timeoutPromise])
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ loading: false })
    }
  },

  resumeSession: async () => {
    // Never clear user state here — a transient network error must not log the user out.
    // The onAuthStateChange listener in initialize() handles legitimate SIGNED_OUT events.
    try {
      const { user, lastAuthCheck, profile } = get()
      if (!user) return // nothing to resume

      const THIRTY_MINUTES = 30 * 60 * 1000
      if (Date.now() - lastAuthCheck < THIRTY_MINUTES) return // still fresh

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        // Network / timeout — keep cached user, Supabase will refresh token on next API call
        console.warn('resumeSession: session check failed, keeping cached state')
        return
      }

      if (!data.session) {
        // Refresh token is genuinely expired — let onAuthStateChange handle cleanup
        // Don't forcibly clear here; the SIGNED_OUT event will fire
        return
      }

      set({ user: data.session.user, lastAuthCheck: Date.now() })

      if (!profile) {
        const fetchProfilePromise = get().fetchProfile(data.session.user.id)
        const timeout = new Promise(resolve => setTimeout(resolve, 5000))
        await Promise.race([fetchProfilePromise, timeout])
      }
    } catch (err) {
      // Never propagate — a crash here must not affect the app
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
      options: { 
        data: { username }, 
        emailRedirectTo: `${window.location.origin}/auth/callback?confirmed=true` 
      }
    })

    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Failed to create user')

    if (data.user && !data.session) {
      throw new Error('✉️ Please check your email to confirm your account.')
    }

    set({ user: data.user })
    await get().fetchProfile(data.user.id)
  },

  // New function: Request Password Reset Email
  resetPasswordForEmail: async (email) => {
    // IMPORTANT: This redirectTo tells Supabase where to send the user 
    // after they click the link in the email.
    const redirectTo = `${window.location.origin}/update-password`
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    if (error) throw error
  },

  // New function: Update Password (used after clicking the link)
  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  signOut: async () => {
    _signingOut = true
    try {
      await supabase.auth.signOut()
    } finally {
      _signingOut = false
    }
    // Clear all persisted app data
    const { useSocialStore } = await import('./socialStore')
    const { useMediaStore } = await import('./mediaStore')
    useSocialStore.getState().resetSocialStore()
    useMediaStore.getState().resetMediaStore()
    // Clear user-specific localStorage drafts
    Object.keys(localStorage)
      .filter(k => k.startsWith('popcorn_') && k !== 'popcorn-auth' && k !== 'popcorn-media' && k !== 'popcorn-social')
      .forEach(k => localStorage.removeItem(k))
    set({ user: null, profile: null, lastAuthCheck: 0, sessionExpired: false })
  },

  clearSessionExpired: () => set({ sessionExpired: false }),

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
  }),
  {
    name: 'popcorn-auth',
    storage: createJSONStorage(() => safeLocalStorage),
    partialize: (state) => ({
      user: state.user,
      profile: state.profile,
      lastAuthCheck: state.lastAuthCheck,
    }),
  }
))