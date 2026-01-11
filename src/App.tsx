import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { isSupabaseConfigured } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import AddEntryPage from './pages/AddEntryPage'
import FeedPage from './pages/FeedPage'
import PeoplePage from './pages/PeoplePage'
import ActivityPage from './pages/ActivityPage'
import LibraryPage from './pages/LibraryPage'
import AdminBadgePanel from './pages/AdminBadgePanel'
import MobileNav from './components/MobileNav'
import DesktopNav from './components/DesktopNav'
import NotificationBanner from './components/NotificationBanner'

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 sm:pb-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Track Your Entertainment</h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-2">Keep track of movies, shows, games, and books you've enjoyed.</p>
        </div>
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl p-6 sm:p-8 text-center">
          <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Ready to start tracking?</h3>
          <button onClick={() => navigate('/auth')} className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-6 sm:px-8 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 active:scale-95 text-sm sm:text-base">
            Create Free Account
          </button>
        </div>
      </main>
    </div>
  )
}

function App() {
  const { initialize, resumeSession, loading } = useAuthStore()

  useEffect(() => {
    if (isSupabaseConfigured) {
      initialize()
    }
  }, [initialize])

  // Silent Rehydration: Check session in background without setting global loading
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab active: checking session health (silent)...')
        resumeSession()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [resumeSession])

  if (!isSupabaseConfigured) return <SetupMessage />

  return (
    <>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin mb-4"></div>
            <div className="text-white text-xl">Loading...</div>
          </div>
        </div>
      ) : (
        <Router>
          <AppContent />
        </Router>
      )}
    </>
  )
}

function AppContent() {
  const location = useLocation()
  const { user } = useAuthStore()
  const showNav = user && location.pathname !== '/auth'

  return (
    <>
      {showNav && <DesktopNav />}
      {showNav && <NotificationBanner />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:username" element={<UserProfilePage />} />
        <Route path="/add" element={<AddEntryPage />} />
        <Route path="/admin/badges" element={<AdminBadgePanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <MobileNav />}
    </>
  )
}

export default App