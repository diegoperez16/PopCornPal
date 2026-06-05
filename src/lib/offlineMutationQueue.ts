import { createStore, get, set } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import { registerOfflineSync } from './push'
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

const offlineMutationStore = createStore('popcornpal', 'offline-mutations')
const offlineMutationKey = 'queue'

type OfflineMutationBase = {
  id: string
  createdAt: string
}

export type OfflineMutation =
  | (OfflineMutationBase & { kind: 'create-post'; payload: CreatePostInput })
  | (OfflineMutationBase & { kind: 'delete-post'; payload: { userId: string; postId: string } })
  | (OfflineMutationBase & { kind: 'create-comment'; payload: CreateCommentInput })
  | (OfflineMutationBase & { kind: 'delete-comment'; payload: { userId: string; commentId: string } })
  | (OfflineMutationBase & { kind: 'update-comment'; payload: UpdateCommentInput })
  | (OfflineMutationBase & { kind: 'toggle-post-like'; payload: ToggleLikeInput })
  | (OfflineMutationBase & { kind: 'toggle-comment-like'; payload: ToggleCommentLikeInput })
  | (OfflineMutationBase & { kind: 'add-entry'; payload: { userId: string; entry: MediaEntryMutationInput } })
  | (OfflineMutationBase & { kind: 'update-entry'; payload: { id: string; updates: Partial<MediaEntryMutationInput> } })
  | (OfflineMutationBase & { kind: 'delete-entry'; payload: { id: string } })
  | (OfflineMutationBase & { kind: 'upsert-episode-rating'; payload: EpisodeRatingMutationInput })

type QueueListener = () => void

const listeners = new Set<QueueListener>()
let queueSnapshot = 0
let flushPromise: Promise<number> | null = null

function emitQueueChange(nextCount: number) {
  queueSnapshot = nextCount
  listeners.forEach(listener => listener())
}

async function readQueue() {
  return (await get<OfflineMutation[]>(offlineMutationKey, offlineMutationStore)) ?? []
}

async function writeQueue(queue: OfflineMutation[]) {
  await set(offlineMutationKey, queue, offlineMutationStore)
  emitQueueChange(queue.length)
}

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

function isRetryableMutationError(error: unknown) {
  if (canQueueOffline()) return true
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('load failed')
  )
}

export async function initializeOfflineMutationQueue() {
  const queue = await readQueue()
  emitQueueChange(queue.length)
}

export async function getQueuedOfflineMutations() {
  return readQueue()
}

export async function enqueueOfflineMutation(
  mutation: Omit<OfflineMutation, 'id' | 'createdAt'>
) {
  const queue = await readQueue()
  const queuedMutation: OfflineMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  } as OfflineMutation

  queue.push(queuedMutation)
  await writeQueue(queue)
  await registerOfflineSync()

  return queuedMutation
}

export async function executeQueuedMutationOrRun<T>(
  mutation: Omit<OfflineMutation, 'id' | 'createdAt'>,
  action: () => Promise<T>
): Promise<{ queued: boolean; result?: T }> {
  if (canQueueOffline()) {
    await enqueueOfflineMutation(mutation)
    return { queued: true }
  }

  try {
    const result = await action()
    return { queued: false, result }
  } catch (error) {
    if (!isRetryableMutationError(error)) throw error
    await enqueueOfflineMutation(mutation)
    return { queued: true }
  }
}

export async function flushOfflineMutationQueue() {
  if (flushPromise) {
    const flushed = await flushPromise
    return { flushed }
  }

  flushPromise = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0

    const queue = await readQueue()
    if (queue.length === 0) {
      emitQueueChange(0)
      return 0
    }

    const remaining: OfflineMutation[] = []
    let flushedCount = 0

    for (let index = 0; index < queue.length; index += 1) {
      const mutation = queue[index]
      try {
        await runOfflineMutation(mutation)
        flushedCount += 1
      } catch (error) {
        if (isRetryableMutationError(error)) {
          remaining.push(...queue.slice(index))
          break
        }

        console.error('[offline-queue] dropping mutation after non-retryable failure', mutation, error)
      }
    }

    await writeQueue(remaining)
    return flushedCount
  })()

  try {
    const flushed = await flushPromise
    return { flushed }
  } finally {
    flushPromise = null
  }
}

export function useOfflineMutationCount() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
