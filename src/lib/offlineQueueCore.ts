export type OwnedQueueItem = { id: string; userId: string }

export interface QueueStorage<T> {
  read: (userId: string) => Promise<T[]>
  /** Must be one atomic storage transaction, not a separate read followed by a write. */
  update: (userId: string, transform: (items: T[]) => T[]) => Promise<void>
}

/** Storage-independent queue processor. An acknowledgment only removes its own ID. */
export function createOfflineQueue<T extends OwnedQueueItem>(
  storage: QueueStorage<T>
) {
  const flushes = new Map<
    string,
    Promise<{ flushed: number; error?: unknown }>
  >()

  return {
    read: storage.read,
    async enqueue(item: T) {
      await storage.update(item.userId, (items) => [...items, item])
      return item
    },
    flush(
      userId: string,
      canContinue: () => boolean,
      run: (item: T) => Promise<unknown>
    ) {
      const existing = flushes.get(userId)
      if (existing) return existing

      const operation = (async () => {
        let flushed = 0
        const items = await storage.read(userId)
        for (const item of items) {
          // Session changes and offline transitions must stop replay immediately.
          if (!canContinue()) break
          if (item.userId !== userId)
            return {
              flushed,
              error: new Error('Offline change belongs to another account.'),
            }
          try {
            await run(item)
          } catch (error) {
            // Keep failed work and its dependents. Authentication or a server error
            // is never permission to silently delete someone's unsynced changes.
            return { flushed, error }
          }
          await storage.update(userId, (current) =>
            current.filter((entry) => entry.id !== item.id)
          )
          flushed += 1
        }
        return { flushed }
      })().finally(() => {
        flushes.delete(userId)
      })

      flushes.set(userId, operation)
      return operation
    },
  }
}
