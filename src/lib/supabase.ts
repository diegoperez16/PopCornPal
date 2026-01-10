import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured (must be actual URLs, not placeholders)
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your_supabase') &&
  !supabaseAnonKey.includes('your_supabase')
)

// Create a dummy client if env vars are missing (for development)
export let supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'
)

export const resetSupabaseClient = () => {
  console.log('Resetting Supabase client connection...')
  supabase = createClient(
    isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
    isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'
  )
}

// Helper for requests that might hang due to connection issues
export const safeSupabaseRequest = async <T>(
  promise: Promise<T>, 
  timeout = 8000, // 8 seconds - fast but allows time for network
  fallbackValue?: T
): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Supabase request timed out'))
    }, timeout)
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    const err = error as Error;
    if (err.message === 'Supabase request timed out') {
      console.warn('Supabase request timed out - connection might be stale')
      // Dispatch event to notify app of connection issues
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-timeout'))
      }
    }
    if (fallbackValue !== undefined) return fallbackValue;
    throw error;
  }
}

// Types for our database tables
export type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  badges: string[] // DEPRECATED - use user_badges table instead
  is_admin: boolean
  created_at: string
  updated_at: string
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
  rating: number // 1-5 stars
  status: 'completed' | 'in-progress' | 'planned'
  completed_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
