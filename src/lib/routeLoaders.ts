export const loadFeedPage = () => import('../pages/FeedPage')
export const loadPeoplePage = () => import('../pages/PeoplePage')
export const loadActivityPage = () => import('../pages/ActivityPage')
export const loadLibraryPage = () => import('../pages/LibraryPage')
export const loadProfilePage = () => import('../pages/ProfilePage')
export const loadUserProfilePage = () => import('../pages/UserProfilePage')
export const loadAddEntryPage = () => import('../pages/AddEntryPage')
export const loadAdminBadgePanel = () => import('../pages/AdminBadgePanel')

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  '/feed': loadFeedPage,
  '/people': loadPeoplePage,
  '/activity': loadActivityPage,
  '/library': loadLibraryPage,
  '/profile': loadProfilePage,
  '/add': loadAddEntryPage,
  '/admin/badges': loadAdminBadgePanel,
}

const routePrefetchPromises = new Map<string, Promise<unknown>>()

export function prefetchRouteModule(path: string) {
  const routePrefetcher = routePrefetchers[path]
  if (!routePrefetcher) return Promise.resolve(undefined)

  const existingPrefetch = routePrefetchPromises.get(path)
  if (existingPrefetch) return existingPrefetch

  const prefetchPromise = routePrefetcher().catch(error => {
    routePrefetchPromises.delete(path)
    throw error
  })

  routePrefetchPromises.set(path, prefetchPromise)
  return prefetchPromise
}

export async function prefetchRouteModules(paths: string[]) {
  for (const path of paths) {
    await prefetchRouteModule(path)
  }
}
