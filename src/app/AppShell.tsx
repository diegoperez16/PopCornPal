import { useEffect, useState, lazy, Suspense } from 'react'
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import MobileHeader from '../components/MobileHeader'
import MobileNav from '../components/MobileNav'
import DesktopNav from '../components/DesktopNav'
import SplashLoader from '../components/SplashLoader'
import WelcomeModal, { shouldShowWelcome } from '../components/WelcomeModal'
import ChunkErrorBoundary from './RouteErrorBoundary'
import PullToRefresh from './PullToRefresh'
import { NetworkErrorBanner, OfflineQueueBanner } from './NetworkStatus'
import PwaUpdateNotice from './PwaUpdateNotice'
import {
  loadActivityPage,
  loadAddEntryPage,
  loadAdminBadgePanel,
  loadFeedPage,
  loadLibraryPage,
  loadPeoplePage,
  loadProfilePage,
  loadUserProfilePage,
  prefetchRouteModules,
} from '../lib/routeLoaders'

// Auth pages load immediately — needed before any session exists
import AuthPage from '../pages/AuthPage'
import UpdatePasswordPage from '../pages/UpdatePasswordPage'

// App pages are lazy-loaded — each becomes its own JS chunk downloaded only when visited
const FeedPage = lazy(loadFeedPage)
const PeoplePage = lazy(loadPeoplePage)
const ActivityPage = lazy(loadActivityPage)
const LibraryPage = lazy(loadLibraryPage)
const ProfilePage = lazy(loadProfilePage)
const UserProfilePage = lazy(loadUserProfilePage)
const AddEntryPage = lazy(loadAddEntryPage)
const AdminBadgePanel = lazy(loadAdminBadgePanel)

function RequireSession() {
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/auth" state={{ from: location.pathname }} replace />
  )
}

function RedirectToProfile() {
  const { username } = useParams<{ username: string }>()
  return <Navigate to={`/profile/${username}`} replace />
}

// Warm only the most likely next screens on mobile instead of importing the
// full authenticated route set right after login.
const MOBILE_ROUTE_WARMUP_TARGETS: Record<string, string[]> = {
  '/feed': ['/add', '/people'],
  '/people': ['/add', '/feed'],
  '/library': ['/feed', '/profile'],
  '/profile': ['/library', '/feed'],
  '/add': ['/feed'],
}

type NavigatorConnection = {
  effectiveType?: string
  saveData?: boolean
}

function shouldWarmMobileRoutes() {
  const isMobileViewport = window.matchMedia('(max-width: 767px)').matches
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  if (!isMobileViewport && !hasCoarsePointer) return false

  const connection = (
    navigator as Navigator & { connection?: NavigatorConnection }
  ).connection
  if (!connection) return true

  return (
    !connection.saveData &&
    connection.effectiveType !== 'slow-2g' &&
    connection.effectiveType !== '2g'
  )
}

function getMobileRouteWarmupTargets(pathname: string) {
  if (pathname.startsWith('/profile/')) {
    return ['/feed', '/people']
  }

  if (pathname.startsWith('/admin/')) {
    return ['/feed']
  }

  return MOBILE_ROUTE_WARMUP_TARGETS[pathname] ?? ['/add']
}

export default function AppShell() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  // The account's saved theme wins over this device's cached guess, so a
  // choice made on one phone shows up on the next.
  const savedTheme = useAuthStore((state) => state.profile?.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  useEffect(() => {
    if (savedTheme) setTheme(savedTheme)
  }, [savedTheme, setTheme])
  const showNav =
    user &&
    !location.pathname.startsWith('/auth') &&
    location.pathname !== '/update-password'

  // Show welcome modal for logged-in users on a version bump
  const [showWelcome, setShowWelcome] = useState(false)
  useEffect(() => {
    if (user && shouldShowWelcome()) {
      // Small delay so the page content renders first
      const t = setTimeout(() => setShowWelcome(true), 800)
      return () => clearTimeout(t)
    }
  }, [user])

  useEffect(() => {
    if (!user || !shouldWarmMobileRoutes()) return

    const targets = getMobileRouteWarmupTargets(location.pathname).filter(
      (path) => path !== location.pathname
    )

    if (targets.length === 0) return

    let timeoutId: number | null = null
    let idleId: number | null = null

    const runPrefetch = () => {
      void prefetchRouteModules(targets)
    }

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(runPrefetch, { timeout: 1500 })
    } else {
      timeoutId = window.setTimeout(runPrefetch, 1200)
    }

    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [location.pathname, user])

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {showNav && <MobileHeader key={user?.id} />}
      {showNav && <DesktopNav key={user?.id} />}
      <div id="main-content" tabIndex={-1}>
        <ChunkErrorBoundary key={user?.id ?? 'guest'}>
          <Suspense fallback={<SplashLoader />}>
            <Routes>
              <Route
                path="/"
                element={<Navigate to={user ? '/feed' : '/auth'} replace />}
              />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthPage />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />
              {/* A profile is the one page you can hand to somebody who has no
                  account: a shared link opens it signed out, read-only. */}
              <Route path="/profile/:username" element={<UserProfilePage />} />
              {/* Legacy redirect for any old /user/ links */}
              <Route path="/user/:username" element={<RedirectToProfile />} />
              <Route element={<RequireSession />}>
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/people" element={<PeoplePage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/add" element={<AddEntryPage />} />
                <Route path="/admin/badges" element={<AdminBadgePanel />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ChunkErrorBoundary>
      </div>
      {showNav && <MobileNav />}
      {showNav && <PullToRefresh />}
      <PwaUpdateNotice />
      <NetworkErrorBanner />
      <OfflineQueueBanner />

      {/* Welcome / PWA onboarding modal */}
      {showWelcome && user && (
        <WelcomeModal userId={user.id} onClose={() => setShowWelcome(false)} />
      )}
    </>
  )
}
