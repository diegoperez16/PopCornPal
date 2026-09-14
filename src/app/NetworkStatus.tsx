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
    <div
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[500] flex -translate-x-1/2 items-center gap-3 rounded-full border border-line-soft bg-surface-strong py-0.5 pl-4 pr-2 text-sm text-gray-200 shadow-2xl md:bottom-6"
    >
      <span>Something went wrong.</span>
      <button
        type="button"
        onClick={() => queryClient.refetchQueries({ type: 'active' })}
        className="min-h-11 px-2 font-semibold text-accent-soft"
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
    <div
      aria-live="polite"
      className="app-note app-note-warn fixed bottom-32 left-1/2 z-[520] w-[calc(100%-32px)] max-w-md -translate-x-1/2 shadow-2xl backdrop-blur md:bottom-6"
    >
      {syncError
        ? syncError
        : isOnline
          ? `Syncing ${queuedCount} queued ${queuedCount === 1 ? 'change' : 'changes'}...`
          : `${queuedCount} ${queuedCount === 1 ? 'change is' : 'changes are'} queued and will sync when you're back online.`}
      {syncError && isOnline && (
        <button
          type="button"
          className="ml-3 inline-flex min-h-11 items-center font-semibold underline"
          onClick={() => void flushOfflineMutationQueue()}
        >
          Retry sync
        </button>
      )}
    </div>
  )
}
