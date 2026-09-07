/** A generation changes even when someone signs out and back into the same account. */
export function createAccountScope() {
  let userId: string | null = null
  let generation = 0
  const listeners = new Set<() => void>()

  return {
    get userId() {
      return userId
    },
    capture: () => ({ userId, generation }),
    isCurrent: (snapshot: { userId: string | null; generation: number }) =>
      snapshot.userId === userId && snapshot.generation === generation,
    set(nextUserId: string | null) {
      if (nextUserId === userId) return
      userId = nextUserId
      generation += 1
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const accountScope = createAccountScope()
