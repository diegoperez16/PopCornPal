import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { isSupabaseConfigured, supabase, safeSupabaseRequest } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import AddEntryPage from './pages/AddEntryPage'
import FeedPage from './pages/FeedPage'
import PeoplePage from './pages/PeoplePage'
import ActivityPage from './pages/ActivityPage'
import LibraryPage from './pages/LibraryPage'
import MobileNav from './components/MobileNav'
import DesktopNav from './components/DesktopNav'
import NotificationBanner from './components/NotificationBanner'

function SetupMessage() {
  console.log('SetupMessage is rendering!')
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
          <ol className="space-y-3 text-gray-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">1</span>
              <span>Create a free Supabase account at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline">supabase.com</a></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">2</span>
              <span>Create a new project and run the SQL from <code className="bg-gray-800 px-2 py-1 rounded">supabase-schema.sql</code></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">3</span>
              <span>Copy <code className="bg-gray-800 px-2 py-1 rounded">.env.example</code> to <code className="bg-gray-800 px-2 py-1 rounded">.env</code></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">4</span>
              <span>Add your Supabase URL and anon key to <code className="bg-gray-800 px-2 py-1 rounded">.env</code></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">5</span>
              <span>Restart the dev server: <code className="bg-gray-800 px-2 py-1 rounded">npm run dev</code></span>
            </li>
          </ol>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            📖 <strong>Detailed guide:</strong> See <code className="bg-gray-800 px-2 py-1 rounded">SUPABASE_SETUP.md</code> for step-by-step instructions
          </p>
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

function ConnectionGuardian() {
  const { loading } = useAuthStore()

  useEffect(() => {
    const checkConnection = async () => {
      // Only check if visible
      if (document.visibilityState !== 'visible') return

      console.log('App became visible, checking connection health...')
      
      try {
        // Ping Supabase with a very short timeout
        // We just check if we can make a simple query
        await safeSupabaseRequest(
          supabase.from('profiles').select('count').limit(1).maybeSingle() as any,
          2000
        )
        console.log('Connection is healthy')
      } catch (error) {
        console.warn('Connection check failed on resume - reloading app to recover')
        // If we are stuck loading OR if the ping failed, we reload
        // But if we are NOT loading, maybe we shouldn't reload?
        // The user said "if its loading then wait a few seconds and automatically refresh"
        // But if the connection is dead, we SHOULD reload because next action will fail.
        // However, to be safe and strictly follow "if its loading", we can check loading state.
        
        // But 'loading' might be false if auth finished but subsequent fetches are hanging.
        // So a dead ping is a better indicator of "stuck" state than just the variable.
        window.location.reload()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnection()
      }
    }

    const handleTimeout = () => {
      console.warn('Received global supabase timeout event')
      // Only reload if we are visible (user is actively trying to use the app)
      // and prevent multiple reloads in short succession
      if (document.visibilityState === 'visible') {
        const lastReload = sessionStorage.getItem('last_auto_reload')
        const now = Date.now()
        
        // Prevent reload loops - only reload if it's been at least 10 seconds since the last one
        if (!lastReload || (now - parseInt(lastReload)) > 10000) {
          console.warn('Reloading app due to connection timeout...')
          sessionStorage.setItem('last_auto_reload', now.toString())
          window.location.reload()
        } else {
          console.log('Skipping reload - too soon since last reload')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('supabase-timeout', handleTimeout)
    
    // Also run check immediately if we are stuck loading for more than 5s on mount
    let mountTimer: any
    if (loading) {
       mountTimer = setTimeout(() => {
         if (loading) {
           console.warn('Stuck loading on mount - checking connection')
           checkConnection()
         }
       }, 5000)
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('supabase-timeout', handleTimeout)
      if (mountTimer) clearTimeout(mountTimer)
    }
  }, [loading])

  return null
}

function App() {
  const { initialize, loading } = useAuthStore()

  console.log('App is rendering!', { isSupabaseConfigured, loading })

  useEffect(() => {
    if (isSupabaseConfigured) {
      initialize()
    }
  }, [initialize])

  // Show setup message if Supabase is not configured
  if (!isSupabaseConfigured) {
    return <SetupMessage />
  }

  return (
    <>
      <ConnectionGuardian />
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
  
  // Don't show nav on auth page or home page when logged out
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <MobileNav />}
    </>
  )
}

export default App
