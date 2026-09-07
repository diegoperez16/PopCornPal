import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useOfflineMutationCount,
  useOfflineMutationError,
  flushOfflineMutationQueue,
} from '../lib/offlineMutationQueue'

export function NetworkErrorBanner() {
  const queryClient = useQueryClient()
  const [hasError, setHasError] = useState(false)

  const checkErrors = useCallback(() => {
    // Only show when a query is actively failing right now (fetchStatus === 'fetching'
    // with an error, or errored within the last 10s). Ignore stale errors from previous
    // pages — those shouldn't interrupt the current view.
    const now = Date.now()
    const recentlyFailed = queryClient
      .getQueryCache()
      .getAll()
      .some(
        (q) =>
          q.state.status === 'error' &&
          q.state.fetchStatus === 'idle' &&
          q.observers.length > 0 && // query has active observers (is used on screen)
          now - (q.state.errorUpdatedAt ?? 0) < 10_000
      )
    setHasError(recentlyFailed)
  }, [queryClient])

  useEffect(() => {
    return queryClient.getQueryCache().subscribe(checkErrors)
  }, [queryClient, checkErrors])

  if (!hasError) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-full px-4 py-2.5 shadow-2xl text-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="text-gray-300">Something went wrong.</span>
      <button
        onClick={() => queryClient.refetchQueries({ type: 'active' })}
        className="font-semibold text-red-400 hover:text-red-300 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

export function OfflineQueueBanner() {
  const queuedCount = useOfflineMutationCount()
  const syncError = useOfflineMutationError()
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (queuedCount === 0 && !syncError) return null

  return (
    <div className="fixed bottom-32 md:bottom-6 left-1/2 -translate-x-1/2 z-[520] w-[calc(100%-32px)] max-w-md rounded-2xl border border-amber-500/30 bg-[#29241c] px-4 py-2 text-sm text-amber-100 shadow-2xl backdrop-blur">
      {syncError
        ? syncError
        : isOnline
          ? `Syncing ${queuedCount} queued ${queuedCount === 1 ? 'change' : 'changes'}...`
          : `${queuedCount} ${queuedCount === 1 ? 'change is' : 'changes are'} queued and will sync when you're back online.`}
      {syncError && isOnline && (
        <button
          className="ml-3 underline"
          onClick={() => void flushOfflineMutationQueue()}
        >
          Retry sync
        </button>
      )}
    </div>
  )
}
