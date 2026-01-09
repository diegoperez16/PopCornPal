import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
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
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      // Check for auth tokens in URL (email confirmation, password reset, etc.)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      
      if (accessToken && refreshToken) {
        console.log('Setting session from URL tokens')
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        
        if (error) {
          console.error('Error setting session:', error)
        } else if (data.session?.user) {
          console.log('Session set successfully for user:', data.session.user.id)
          set({ user: data.session.user })
          
          // Check if profile exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .maybeSingle()
          
          if (!profile) {
            console.log('No profile found, creating one from user metadata')
            // Get username from user metadata (saved during signup)
            const username = data.session.user.user_metadata?.username || 
                           data.session.user.email?.split('@')[0] || 
                           'user_' + data.session.user.id.substring(0, 8)
            
            // Create profile automatically
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.session.user.id,
                username: username.toLowerCase().trim(),
                full_name: null,
                avatar_url: null,
                bio: null,
              })
            
            if (profileError) {
              console.error('Error creating profile:', profileError)
            } else {
              console.log('Profile created successfully')
              // Fetch the newly created profile
              await get().fetchProfile(data.session.user.id)
            }
          } else {
            set({ profile })
          }
          
          // Clean up URL and redirect to feed after successful confirmation
          window.history.replaceState({}, document.title, '/feed')
          set({ loading: false })
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event)
        set({ user: session?.user ?? null })
        if (session?.user) {
          await get().fetchProfile(session.user.id)
        } else {
          set({ profile: null })
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (data.user) {
      set({ user: data.user })
      await get().fetchProfile(data.user.id)
    }
  },

  signUp: async (email: string, password: string, username: string) => {
    try {
      // First create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: `${window.location.origin}/auth?confirmed=true`
        }
      })

      if (error) {
        console.error('Signup error:', error)
        throw new Error(error.message || 'Failed to create account')
      }
      
      if (!data.user) {
        throw new Error('Failed to create user')
      }

      console.log('User created:', data.user.id)
      console.log('Session exists:', !!data.session)
      console.log('User confirmed:', data.user.confirmed_at)

      // Check if email confirmation is required
      if (data.user && !data.session) {
        console.log('Email confirmation required - check your inbox')
        throw new Error('✉️ Please check your email to confirm your account. Check spam folder if you don\'t see it.')
      }

      // If no email confirmation needed, create profile immediately
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: username.toLowerCase().trim(),
          full_name: null,
          avatar_url: null,
          bio: null,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new Error(profileError.message || 'Failed to create profile')
      }

      console.log('Profile created for:', username)

      set({ user: data.user })
      await get().fetchProfile(data.user.id)
    } catch (error) {
      console.error('SignUp failed:', error)
      throw error
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    set({ user: null, profile: null })
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()  // Use maybeSingle instead of single to handle 0 rows

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      if (!data) {
        console.log('No profile found for user:', userId)
        return
      }

      set({ profile: data })
    } catch (error) {
      console.error('Unexpected error fetching profile:', error)
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { user, profile } = get()
    if (!user || !profile) throw new Error('No user logged in')

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
