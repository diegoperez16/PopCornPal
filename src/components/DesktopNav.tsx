import { Users, Search, Plus, Calendar, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import NotificationBell from './NotificationBell'

export default function DesktopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, profile } = useAuthStore()

  const navItems = [
    { path: '/feed', icon: Users, label: 'Feed' },
    { path: '/people', icon: Search, label: 'People' },
    { path: '/activity', icon: Calendar, label: 'Activity' },
    { path: '/add', icon: Plus, label: 'Add' },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <nav className="hidden md:block bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <h1
              className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate('/feed')}
            >
              🍿 PopcornPal
            </h1>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                      isActive
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            {/* Avatar / profile link */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-800 transition-colors"
              title={profile?.username}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (profile?.username?.[0] ?? '?').toUpperCase()
                )}
              </div>
              <span className="text-sm font-medium text-gray-300">{profile?.username}</span>
            </button>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
