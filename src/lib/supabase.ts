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

// Hard timeout for ALL Supabase network requests (aborts the underlying fetch)
const REQUEST_TIMEOUT_MS = 60000

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
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
  rating: number
  status: 'completed' | 'in-progress' | 'planned' | 'logged'
  completed_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  genre?: string | null
  year?: number | null
  cover_image_url?: string | null
}
