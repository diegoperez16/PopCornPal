import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { supabase, type Profile } from '../lib/supabase'
import { accountScope } from '../lib/accountScope'
import {
  clearPersistedQueryCache,
  queryClient,
  setQueryCacheUser,
} from '../lib/queryClient'

let signingOut = false
let initialization: Promise<void> | null = null
let resumePromise: Promise<void> | null = null
let listenerInstalled = false
let authRevision = 0
const profileRequests = new Map<string, Promise<void>>()

const safeLocalStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* Auth works without a profile cache. */
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* Storage may be disabled. */
    }
  },
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Session request timed out')),
          milliseconds
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  lastAuthCheck: number
  sessionExpired: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<'signed-in' | 'confirmation-required'>
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
    (set, get) => {
      async function applyUser(user: User | null, sessionExpired = false) {
        const ready = setQueryCacheUser(user?.id ?? null)
        const scope = accountScope.capture()
        const cachedProfile = get().profile
        // A stored profile is display data, never proof of an authenticated session.
        set({
          user,
          profile: cachedProfile?.id === user?.id ? cachedProfile : null,
          lastAuthCheck: user ? Date.now() : 0,
          sessionExpired,
        })
        await ready
        return accountScope.isCurrent(scope)
      }

      function installAuthListener() {
        if (listenerInstalled) return
        listenerInstalled = true
        supabase.auth.onAuthStateChange((event, session) => {
          authRevision += 1
          const expired = event === 'SIGNED_OUT' && !signingOut && !!get().user
          const work = applyUser(session?.user ?? null, expired)
          // Supabase holds its auth lock while invoking listeners. Do not await
          // a profile request (which needs that same lock) inside this callback.
          if (session?.user) {
            const userId = session.user.id
            setTimeout(() => {
              void work
                .then((current) => {
                  if (current && get().user?.id === userId)
                    return get().fetchProfile(userId)
                })
                .catch((error) =>
                  console.warn('Could not refresh profile:', error)
                )
            }, 0)
          }
        })
      }

      return {
        user: null,
        profile: null,
        loading: true,
        lastAuthCheck: 0,
        sessionExpired: false,

        initialize: () => {
          if (initialization) return initialization
          installAuthListener()
          initialization = (async () => {
            try {
              const params = new URLSearchParams(
                window.location.hash.substring(1)
              )
              const accessToken = params.get('access_token')
              const refreshToken = params.get('refresh_token')
              const recovery = params.get('type') === 'recovery'
              const revision = authRevision
              const result =
                accessToken && refreshToken
                  ? await withTimeout(
                      supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                      }),
                      8000
                    )
                  : await withTimeout(supabase.auth.getSession(), 8000)
              if (result.error) throw result.error
              const session = result.data.session
              // An auth event that arrived during the read is more recent than it.
              if (
                revision === authRevision ||
                accountScope.userId === session?.user?.id
              ) {
                await applyUser(session?.user ?? null)
              } else {
                await setQueryCacheUser(accountScope.userId)
              }
              if (accessToken && refreshToken) {
                const path =
                  recovery || window.location.pathname === '/update-password'
                    ? '/update-password'
                    : '/feed'
                // Remove credentials from history, including recovery links.
                window.history.replaceState({}, document.title, path)
              }
              const userId = get().user?.id
              if (userId) {
                await withTimeout(get().fetchProfile(userId), 2500).catch(
                  () => {}
                )
              }
            } catch (error) {
              console.warn('Could not initialize session:', error)
              // Never authenticate using a stale application-level localStorage copy.
              // A valid Supabase auth event can still recover the session later.
              await setQueryCacheUser(get().user?.id ?? null)
            } finally {
              set({ loading: false })
            }
          })()
          return initialization
        },

        resumeSession: () => {
          if (resumePromise) return resumePromise
          const { user, lastAuthCheck } = get()
          if (!user || Date.now() - lastAuthCheck < 60_000)
            return Promise.resolve()
          const scope = accountScope.capture()
          resumePromise = (async () => {
            try {
              const { data, error } = await withTimeout(
                supabase.auth.refreshSession(),
                8000
              )
              if (!accountScope.isCurrent(scope)) return
              if (error) {
                console.warn('Session refresh failed:', error.message)
                return
              }
              await applyUser(data.session?.user ?? null, !data.session)
              if (data.session && !get().profile)
                await get().fetchProfile(data.session.user.id)
            } catch (error) {
              console.warn('Could not resume session:', error)
            }
          })().finally(() => {
            resumePromise = null
          })
          return resumePromise
        },

        signIn: async (email, password) => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) throw error
          if (data.user) {
            await applyUser(data.user)
            await get().fetchProfile(data.user.id)
          }
        },

        signUp: async (email, password, username) => {
          const { data: existing, error: lookupError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle()
          if (lookupError) throw lookupError
          if (existing)
            throw new Error(
              'Username is already taken. Please choose a different one.'
            )
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { username },
              emailRedirectTo: `${window.location.origin}/auth/callback?confirmed=true`,
            },
          })
          if (error) throw error
          if (!data.user) throw new Error('Failed to create user')
          if (!data.session) return 'confirmation-required'
          await applyUser(data.user)
          await get().fetchProfile(data.user.id)
          return 'signed-in'
        },

        resetPasswordForEmail: async (email) => {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
          })
          if (error) throw error
        },

        updatePassword: async (password) => {
          const { error } = await supabase.auth.updateUser({ password })
          if (error) throw error
        },

        signOut: async () => {
          const userId = get().user?.id
          signingOut = true
          try {
            // A failed sign-out must not masquerade as a successful one. Local
            // scope signs out this device without disrupting other signed-in devices.
            const { error } = await supabase.auth.signOut({ scope: 'local' })
            if (error) throw error
            await applyUser(null)
            await clearPersistedQueryCache(userId).catch(() => {})
          } finally {
            signingOut = false
          }
        },

        clearSessionExpired: () => set({ sessionExpired: false }),

        fetchProfile: (userId) => {
          const key = `${userId}:${accountScope.capture().generation}`
          const existing = profileRequests.get(key)
          if (existing) return existing
          const scope = accountScope.capture()
          const request = (async () => {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle()
            if (error) throw error
            if (accountScope.isCurrent(scope) && get().user?.id === userId) {
              set({ profile: data })
            }
          })().finally(() => {
            profileRequests.delete(key)
          })
          profileRequests.set(key, request)
          return request
        },

        updateProfile: async (updates) => {
          const { user } = get()
          if (!user) throw new Error('No user logged in')
          const scope = accountScope.capture()
          const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select()
            .single()
          if (error) throw error
          if (!accountScope.isCurrent(scope)) return
          set({ profile: data })
          void queryClient.invalidateQueries({
            predicate: (query) =>
              ['feed', 'people', 'profile', 'activity'].includes(
                query.queryKey[0] as string
              ),
          })
        },
      }
    },
    {
      name: 'popcorn-auth',
      version: 2,
      storage: createJSONStorage(() => safeLocalStorage),
      // Supabase owns persisted authentication; only cache profile display data here.
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)
