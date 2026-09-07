/** Draft text belongs to the account that wrote it; blocked storage must not break typing. */
export function createDraftStorage(userId: string) {
  const keyFor = (key: string) => `popcorn:draft:${userId}:${key}`
  return {
    getItem(key: string) {
      try {
        return userId ? localStorage.getItem(keyFor(key)) : null
      } catch {
        return null
      }
    },
    setItem(key: string, value: string) {
      try {
        if (userId) localStorage.setItem(keyFor(key), value)
      } catch {
        /* The current in-memory draft remains available. */
      }
    },
    removeItem(key: string) {
      try {
        if (userId) localStorage.removeItem(keyFor(key))
      } catch {
        /* The app also clears its in-memory draft. */
      }
    },
  }
}
