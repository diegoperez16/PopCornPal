import { createStore, get, update } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import { registerOfflineSync } from './push'
import { supabase } from './supabase'
import { accountScope } from './accountScope'
import { createOfflineQueue } from './offlineQueueCore'
import { isAuthError, isNetworkError } from './requestErrors'
import {
  createComment,
  createMediaEntry,
  createPost,
  deleteComment,
  deleteMediaEntry,
  deletePost,
  toggleCommentLike,
  togglePostLike,
  updateComment,
  updateMediaEntry,
  upsertEpisodeRating,
  type CreateCommentInput,
  type CreatePostInput,
  type EpisodeRatingMutationInput,
  type MediaEntryMutationInput,
  type ToggleCommentLikeInput,
  type ToggleLikeInput,
  type UpdateCommentInput,
} from './userMutations'

const offlineMutationStore = createStore(
  'popcornpal-offline',
  'offline-mutations'
)
const queueKey = (userId: string) => `queue:v2:${userId}`

type OfflineMutationBase = {
  id: string
  createdAt: string
  userId: string
}

export type OfflineMutation =
  | (OfflineMutationBase & { kind: 'create-post'; payload: CreatePostInput })
  | (OfflineMutationBase & {
      kind: 'delete-post'
      payload: { userId: string; postId: string }
    })
  | (OfflineMutationBase & {
      kind: 'create-comment'
      payload: CreateCommentInput
    })
  | (OfflineMutationBase & {
      kind: 'delete-comment'
      payload: { userId: string; commentId: string }
    })
  | (OfflineMutationBase & {
      kind: 'update-comment'
      payload: UpdateCommentInput
    })
  | (OfflineMutationBase & {
      kind: 'toggle-post-like'
      payload: ToggleLikeInput
    })
  | (OfflineMutationBase & {
      kind: 'toggle-comment-like'
      payload: ToggleCommentLikeInput
    })
  | (OfflineMutationBase & {
      kind: 'add-entry'
      payload: { userId: string; entry: MediaEntryMutationInput }
    })
  | (OfflineMutationBase & {
      kind: 'update-entry'
      payload: { id: string; updates: Partial<MediaEntryMutationInput> }
    })
  | (OfflineMutationBase & { kind: 'delete-entry'; payload: { id: string } })
  | (OfflineMutationBase & {
      kind: 'upsert-episode-rating'
      payload: EpisodeRatingMutationInput
    })

type QueueListener = () => void

const listeners = new Set<QueueListener>()
let queueSnapshot = 0
let queueErrorSnapshot: string | null = null

function emitQueueChange(nextCount: number, error: string | null = null) {
  queueSnapshot = nextCount
  queueErrorSnapshot = error
  listeners.forEach((listener) => listener())
}

const queue = createOfflineQueue<OfflineMutation>({
  read: async (userId) =>
    (await get<OfflineMutation[]>(queueKey(userId), offlineMutationStore)) ??
    [],
  update: (userId, transform) =>
    update<OfflineMutation[]>(
      queueKey(userId),
      (current) => transform(current ?? []),
      offlineMutationStore
    ),
})

// Coordinate replay across installed/browser windows without blocking typing/enqueue.
async function withQueueLock<T>(
  userId: string,
  action: () => Promise<T>
): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(
      `popcorn-queue:${userId}`,
      { signal: AbortSignal.timeout(5000) },
      action
    )
  }
  return action()
}

// The old global queue has no trustworthy owner for entry updates/deletes.
// Keep it intact for recovery; migrate only changes that explicitly identify one.
async function migrateLegacyQueue(userId: string) {
  const legacy = await get<OfflineMutation[]>('queue', offlineMutationStore)
  if (!legacy?.length) return
  const owned = legacy.filter(
    (item) => 'userId' in item.payload && item.payload.userId === userId
  )
  if (!owned.length) return
  await update<OfflineMutation[]>(
    queueKey(userId),
    (current) => {
      const items = current ?? []
      const ids = new Set(items.map((item) => item.id))
      return [
        ...items,
        ...owned
          .filter((item) => !ids.has(item.id))
          .map((item) => ({ ...item, userId })),
      ]
    },
    offlineMutationStore
  )
  const migratedIds = new Set(owned.map((item) => item.id))
  await update<OfflineMutation[]>(
    'queue',
    (current) => (current ?? []).filter((item) => !migratedIds.has(item.id)),
    offlineMutationStore
  )
}

accountScope.subscribe(() => {
  emitQueueChange(0)
  void initializeOfflineMutationQueue().catch(() => {
    emitQueueChange(0, 'Offline changes could not be read from this device.')
  })
})

function subscribe(listener: QueueListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return queueSnapshot
}

function getServerSnapshot() {
  return 0
}

async function runOfflineMutation(mutation: OfflineMutation) {
  switch (mutation.kind) {
    case 'create-post':
      return createPost(mutation.payload)
    case 'delete-post':
      return deletePost(mutation.payload.userId, mutation.payload.postId)
    case 'create-comment':
      return createComment(mutation.payload)
    case 'delete-comment':
      return deleteComment(mutation.payload.userId, mutation.payload.commentId)
    case 'update-comment':
      return updateComment(mutation.payload)
    case 'toggle-post-like':
      return togglePostLike(mutation.payload)
    case 'toggle-comment-like':
      return toggleCommentLike(mutation.payload)
    case 'add-entry':
      return createMediaEntry(mutation.payload.userId, mutation.payload.entry)
    case 'update-entry':
      return updateMediaEntry(mutation.payload.id, mutation.payload.updates)
    case 'delete-entry':
      return deleteMediaEntry(mutation.payload.id)
    case 'upsert-episode-rating':
      return upsertEpisodeRating(mutation.payload)
  }
}

function canQueueOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

function requireMutationOwner(mutation: OfflineMutationInput) {
  const userId = accountScope.userId
  if (!userId) throw new Error('Sign in before saving changes.')
  if ('userId' in mutation.payload && mutation.payload.userId !== userId) {
    throw new Error('Your account changed. Please try saving again.')
  }
  return userId
}

type WithoutMetadata<T> = T extends OfflineMutation
  ? Omit<T, keyof OfflineMutationBase>
  : never
export type OfflineMutationInput = WithoutMetadata<OfflineMutation>

export async function initializeOfflineMutationQueue() {
  const scope = accountScope.capture()
  if (!scope.userId) {
    emitQueueChange(0)
    return
  }
  await withQueueLock(scope.userId, () => migrateLegacyQueue(scope.userId!))
  const items = await queue.read(scope.userId)
  if (accountScope.isCurrent(scope)) emitQueueChange(items.length)
}

export async function getQueuedOfflineMutations() {
  const userId = accountScope.userId
  return userId ? queue.read(userId) : []
}

export async function enqueueOfflineMutation(mutation: OfflineMutationInput) {
  return enqueueForOwner(mutation, requireMutationOwner(mutation))
}

async function enqueueForOwner(mutation: OfflineMutationInput, userId: string) {
  const item = await queue.enqueue({
    ...mutation,
    userId,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  } as OfflineMutation)
  if (accountScope.userId === userId) {
    const items = await queue.read(userId)
    if (accountScope.userId === userId) emitQueueChange(items.length)
  }
  // Saving locally succeeds even if this browser does not support background sync.
  void registerOfflineSync().catch(() => {})
  return item
}

export async function executeQueuedMutationOrRun<T>(
  mutation: OfflineMutationInput,
  action: () => Promise<T>
): Promise<{ queued: boolean; result?: T }> {
  const owner = requireMutationOwner(mutation)
  const scope = accountScope.capture()
  if (canQueueOffline()) {
    await enqueueForOwner(mutation, owner)
    return { queued: true }
  }

  try {
    const result = await action()
    return { queued: false, result }
  } catch (error) {
    if (isAuthError(error)) {
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError && accountScope.isCurrent(scope)) {
        try {
          const result = await action()
          return { queued: false, result }
        } catch (retryError) {
          if (!(canQueueOffline() || isNetworkError(retryError)))
            throw retryError
          await enqueueForOwner(mutation, owner)
          return { queued: true }
        }
      }
      throw error
    }
    if (!(canQueueOffline() || isNetworkError(error))) throw error
    await enqueueForOwner(mutation, owner)
    return { queued: true }
  }
}

export async function flushOfflineMutationQueue() {
  const scope = accountScope.capture()
  if (!scope.userId || canQueueOffline()) return { flushed: 0 }

  const result = await withQueueLock(scope.userId, () =>
    queue.flush(
      scope.userId!,
      () => accountScope.isCurrent(scope) && !canQueueOffline(),
      async (mutation) => {
        try {
          await runOfflineMutation(mutation)
        } catch (error) {
          if (!isAuthError(error)) throw error
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError || !accountScope.isCurrent(scope)) throw error
          await runOfflineMutation(mutation)
        }
      }
    )
  ).catch((error) => ({ flushed: 0, error }))

  if (accountScope.isCurrent(scope)) {
    const items = await queue.read(scope.userId)
    if (accountScope.isCurrent(scope))
      emitQueueChange(
        items.length,
        result.error
          ? 'Some changes could not sync. They are saved on this device; reconnect or sign in again to retry.'
          : null
      )
  }
  return result
}

export function useOfflineMutationError() {
  return useSyncExternalStore(
    subscribe,
    () => queueErrorSnapshot,
    () => null
  )
}

export function useOfflineMutationCount() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
