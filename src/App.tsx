import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuthStore } from './store/authStore'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { queryClient } from './lib/queryClient'
import MobileNav from './components/MobileNav'
import DesktopNav from './components/DesktopNav'
import SplashLoader from './components/SplashLoader'
import WelcomeModal, { shouldShowWelcome } from './components/WelcomeModal'
import { registerOfflineSync } from './lib/push'

// Auth pages load immediately — needed before any session exists
import AuthPage from './pages/AuthPage'
import UpdatePasswordPage from './pages/UpdatePasswordPage'

// App pages are lazy-loaded — each becomes its own JS chunk downloaded only when visited
const FeedPage = lazy(() => import('./pages/FeedPage'))
const PeoplePage = lazy(() => import('./pages/PeoplePage'))
const ActivityPage = lazy(() => import('./pages/ActivityPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'))
const AddEntryPage = lazy(() => import('./pages/AddEntryPage'))
const AdminBadgePanel = lazy(() => import('./pages/AdminBadgePanel'))

function RedirectToProfile() {
  const { username } = useParams<{ username: string }>()
  return <Navigate to={`/profile/${username}`} replace />
}

function SetupMessage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-gray-800/50 backdrop-blur-sm border border-yellow-500/50 rounded-xl p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold text-white mb-2">Setup Required</h1>
          <p className="text-gray-400">PopcornPal needs to be connected to Supabase</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Setup Steps:</h2>
          <p className="text-gray-300">Please check SUPABASE_SETUP.md in your project files.</p>
        </div>
      </div>
    </div>
  )
}

function HomePage() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && profile) {
      navigate('/feed')
    }
  }, [user, profile, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-700 safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
            PopcornPal
          </h1>
          <button
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-4 sm:px-6 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 active:scale-95 text-sm sm:text-base"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 sm:pb-8">
        {/* Welcome Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            Track Your Entertainment
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-2">
            Keep track of movies, shows, games, and books you've enjoyed.
            Share with friends and get your year-end recap.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {[
            { title: 'Movies', desc: 'Track films you\'ve watched', gradient: 'from-red-500 to-orange-500' },
            { title: 'TV Shows', desc: 'Log your binge sessions', gradient: 'from-purple-500 to-pink-500' },
            { title: 'Games', desc: 'Record your gaming journey', gradient: 'from-blue-500 to-cyan-500' },
            { title: 'Books', desc: 'Keep your reading list', gradient: 'from-green-500 to-emerald-500' },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 sm:p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105 active:scale-100"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${feature.gradient} mb-3 sm:mb-4`}></div>
              <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-6 sm:p-8 text-center">
          <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Ready to start tracking?</h3>
          <p className="text-gray-300 text-sm sm:text-base mb-5 sm:mb-6 max-w-xl mx-auto px-2">
            Join PopcornPal today and never forget what you've watched, played, or read.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-6 sm:px-8 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 active:scale-95 text-sm sm:text-base"
          >
            Create Free Account
          </button>
        </div>
      </main>
    </div>
  )
}

function App() {
  const { initialize, resumeSession, user } = useAuthStore()
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      if (isSupabaseConfigured) {
        await initialize()
      }
      setAppReady(true)
    }
    init()
  }, [initialize])

  // Manage Supabase's auto-refresh timer based on tab visibility.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.startAutoRefresh()
        resumeSession()
      } else {
        supabase.auth.stopAutoRefresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [resumeSession])

  // Listen for FLUSH_OFFLINE_QUEUE messages from the service worker (background sync)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FLUSH_OFFLINE_QUEUE') {
        queryClient.invalidateQueries()
      }
    }
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
  }, [])

  // Register background sync so queued writes are replayed when back online
  useEffect(() => {
    if (user) registerOfflineSync()
  }, [user])

  if (!isSupabaseConfigured) return <SetupMessage />

  // Only block on splash if there's no cached user — returning users see the app instantly
  if (!appReady && !user) return <SplashLoader />

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

function AppContent() {
  const location = useLocation()
  const { user } = useAuthStore()
  const showNav = user && location.pathname !== '/auth'

  // Show welcome modal for logged-in users on a version bump
  const [showWelcome, setShowWelcome] = useState(false)
  useEffect(() => {
    if (user && shouldShowWelcome()) {
      // Small delay so the page content renders first
      const t = setTimeout(() => setShowWelcome(true), 800)
      return () => clearTimeout(t)
    }
  }, [user])

  return (
    <>
      {showNav && <DesktopNav />}
      <Suspense fallback={<SplashLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:username" element={<UserProfilePage />} />
          {/* Legacy redirect for any old /user/ links */}
          <Route path="/user/:username" element={<RedirectToProfile />} />
          <Route path="/add" element={<AddEntryPage />} />
          <Route path="/admin/badges" element={<AdminBadgePanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {showNav && <MobileNav />}

      {/* Welcome / PWA onboarding modal */}
      {showWelcome && user && (
        <WelcomeModal userId={user.id} onClose={() => setShowWelcome(false)} />
      )}
    </>
  )
}

export default App
