import { useEffect, useState, useCallback, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../store/authStore'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'
import {
  flushOfflineMutationQueue,
  initializeOfflineMutationQueue,
} from '../lib/offlineMutationQueue'
import { registerOfflineSync } from '../lib/push'

export function useAppLifecycle() {
  const { initialize, resumeSession, user } = useAuthStore(
    useShallow((state) => ({
      initialize: state.initialize,
      resumeSession: state.resumeSession,
      user: state.user,
    }))
  )
  const [appReady, setAppReady] = useState(false)

  const flushPendingMutations = useCallback(async () => {
    const { flushed } = await flushOfflineMutationQueue()
    if (flushed > 0) {
      queryClient.invalidateQueries({
        predicate: (query) =>
          [
            'feed',
            'media',
            'activity',
            'profile',
            'people',
            'episodes',
          ].includes(query.queryKey[0] as string),
      })
    }
  }, [])

  useEffect(() => {
    let settled = false
    let mounted = true
    const markReady = () => {
      if (settled || !mounted) return
      settled = true
      setAppReady(true)
    }

    // Failsafe: never let the splash block the app for more than 8s. supabase-js's
    // auth lock can occasionally deadlock (notably after the tab was backgrounded),
    // leaving init() awaiting forever — which previously stuck users on the loading
    // screen permanently. If that happens we render anyway; the onAuthStateChange
    // listener and the resume coordinator below bring state up to date afterward.
    const failsafe = window.setTimeout(() => {
      console.warn('App init failsafe fired — rendering before init settled')
      markReady()
    }, 8000)

    const init = async () => {
      try {
        if (isSupabaseConfigured) {
          await initialize()
        }
        await initializeOfflineMutationQueue()
        await flushPendingMutations()
      } catch (e) {
        console.error('App init error:', e)
      } finally {
        window.clearTimeout(failsafe)
        markReady()
      }
    }
    init()
    return () => {
      mounted = false
      window.clearTimeout(failsafe)
    }
  }, [flushPendingMutations, initialize])

  // Resume coordinator: refetchOnWindowFocus/refetchOnReconnect are disabled
  // globally (they caused visible spinners on every tab switch), so nothing
  // else refreshes stale data when the app comes back from the background.
  // Realtime channels also silently die while a mobile tab is backgrounded
  // and don't always reconnect cleanly. This is the single place that brings
  // the app back to a correct, fresh state on resume:
  //   1. resume the auth session (token may have expired while backgrounded)
  //   2. flush any offline-queued mutations
  //   3. invalidate all queries so active ones refetch in the background —
  //      the user sees cached data instantly (no spinner) while fresh data
  //      loads behind the scenes
  const hiddenAtRef = useRef(0)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const away =
          hiddenAtRef.current > 0 ? Date.now() - hiddenAtRef.current : Infinity

        supabase.auth.startAutoRefresh()
        // Invalidate FIRST and unconditionally. Do NOT await the session
        // refresh before invalidating: supabase-js's auth lock can hang after
        // the tab was backgrounded, and gating the refresh behind
        // `await resumeSession()` meant a hung refresh left the app stuck on
        // stale data until a manual reload. The session refresh + queue flush
        // run in the background; any query that races ahead of the new token
        // and 401s is recovered by the QueryCache auth handler in queryClient.ts.
        //
        // Quick tab switches (< 10s) skip invalidation — realtime subscriptions
        // are still alive and staleTime covers the gap.
        if (away > 10_000) {
          queryClient.invalidateQueries()
        }
        void resumeSession()
        void flushPendingMutations()
      } else {
        hiddenAtRef.current = Date.now()
        supabase.auth.stopAutoRefresh()
      }
    }

    const handleOnlineResume = () => {
      queryClient.invalidateQueries()
      void flushPendingMutations()
    }

    // pageshow (bfcache restore) and resume (mobile unfreeze) indicate the page
    // was suspended for a non-trivial period — always invalidate.
    const handlePageResume = () => {
      queryClient.invalidateQueries()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnlineResume)
    window.addEventListener('pageshow', handlePageResume)
    document.addEventListener('resume', handlePageResume)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnlineResume)
      window.removeEventListener('pageshow', handlePageResume)
      document.removeEventListener('resume', handlePageResume)
    }
  }, [flushPendingMutations, resumeSession])

  // Listen for FLUSH_OFFLINE_QUEUE messages from the service worker (background sync)
  // Only invalidate feed and media since those are what offline writes affect.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'FLUSH_OFFLINE_QUEUE') {
        await flushPendingMutations()
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () =>
      navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [flushPendingMutations])

  // Register background sync so queued writes are replayed when back online
  useEffect(() => {
    if (user) registerOfflineSync()
  }, [user])

  return appReady
}
