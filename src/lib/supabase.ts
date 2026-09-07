import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your_supabase') &&
  !supabaseAnonKey.includes('your_supabase')
)

// Auth token refreshes need more time (mobile networks can be slow on resume)
// Data queries get extra headroom for post-inactivity reconnection on mobile
const AUTH_TIMEOUT_MS = 30000
const DATA_TIMEOUT_MS = 25000

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input as Request).url
  const isAuth = url.includes('/auth/v1/')
  const timeoutMs = isAuth ? AUTH_TIMEOUT_MS : DATA_TIMEOUT_MS

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Combine our timeout signal with any signal Supabase may have passed
    const existingSignal = (init as RequestInit)?.signal
    const signal = existingSignal
      ? AbortSignal.any([controller.signal, existingSignal])
      : controller.signal
    return await fetch(input, { ...init, signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// Bypass navigator.locks entirely. The default Supabase auth lock uses
// navigator.locks with acquireTimeout: -1 (infinite). If a lock is stuck
// (crashed tab, browser bug, or slow token refresh), _getAccessToken() hangs
// on every single query because it calls getSession() → _acquireLock().
// A no-op lock lets the auth client's internal pendingInLock queue handle
// serialization within a single tab — cross-tab coordination is lost but
// the app never deadlocks.
const lockNoOp = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => {
  return await fn()
}

// Create the client via a factory so resetSupabaseClient reuses the exact same config
const makeClient = () =>
  createClient(
    isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
    isSupabaseConfigured
      ? supabaseAnonKey
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder',
    {
      global: { fetch: fetchWithTimeout },
      auth: { lock: lockNoOp },
    }
  )

// Create a dummy client if env vars are missing (for development)
export let supabase = makeClient()

export const resetSupabaseClient = () => {
  console.log('Resetting Supabase client connection...')
  supabase = makeClient()
}

// Types for our database tables
export type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  badges: string[] 
  is_admin: boolean
  created_at: string
  updated_at: string
  bg_url: string | null
  bg_opacity: number | null
  bg_crop?: BackgroundCrop | null
  avatar_crop?: AvatarCrop | null
  /** Seasonal theme id; unknown values fall back to cinema. */
  theme?: string | null
  /** Hogwarts house; null until sorted. */
  house?: string | null
}

export type BackgroundCrop = {
  desktop: CropSettings
  mobile: CropSettings
}

export type CropSettings = {
  x: number
  y: number
  scale: number
}

export type AvatarCrop = {
  x: number
  y: number
  scale: number
}

export type Badge = {
  id: string
  name: string
  description: string | null
  color: string
  gif_url: string | null
  opacity: number
  admin_only: boolean
  created_at: string
  updated_at: string
}

export type UserBadge = {
  id: string
  user_id: string
  badge_id: string
  given_by: string | null
  given_at: string
  badges?: Badge
}

export type MediaType = 'movie' | 'show' | 'game' | 'book'

export type MediaEntry = {
  id: string
  user_id: string
  media_type: MediaType
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
