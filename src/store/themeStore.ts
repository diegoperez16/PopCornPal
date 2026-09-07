import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { applyTheme, getTheme, type Theme } from '../themes/themes'

// The choice is cached locally so the app paints the right theme on the very
// first frame, before the profile round-trip finishes. Supabase is still the
// record of truth, so the theme follows a person across devices.
const CACHE_KEY = 'popcorn_theme'

function readCache(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY)
  } catch {
    return null
  }
}

function writeCache(id: string) {
  try {
    localStorage.setItem(CACHE_KEY, id)
  } catch {
    /* private mode or blocked storage: the profile still holds the choice */
  }
}

type ThemeState = {
  theme: Theme
  /** Paints a theme immediately and remembers it on this device. */
  setTheme: (id: string) => void
  /** Paints a theme and saves it to the signed-in profile. */
  chooseTheme: (id: string, userId: string) => Promise<void>
  /** Applies the cached choice before any network call. */
  hydrateFromCache: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getTheme(readCache()),

  setTheme: (id) => {
    const theme = getTheme(id)
    applyTheme(theme, document.documentElement)
    writeCache(theme.id)
    set({ theme })
  },

  chooseTheme: async (id, userId) => {
    const theme = getTheme(id)
    applyTheme(theme, document.documentElement)
    writeCache(theme.id)
    set({ theme })
    if (!userId) return
    // A failed save leaves the theme applied locally; it simply will not
    // follow the account to another device until the next successful write.
    await supabase.from('profiles').update({ theme: theme.id }).eq('id', userId)
  },

  hydrateFromCache: () => {
    const theme = getTheme(readCache())
    applyTheme(theme, document.documentElement)
    set({ theme })
  },
}))
