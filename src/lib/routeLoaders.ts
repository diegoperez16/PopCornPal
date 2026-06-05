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

export function prefetchRouteModule(path: string) {
  return routePrefetchers[path]?.()
}

export function prefetchPrimaryRoutes() {
  return Promise.all([
    loadFeedPage(),
    loadPeoplePage(),
    loadActivityPage(),
    loadLibraryPage(),
    loadProfilePage(),
    loadAddEntryPage(),
  ])
}
