import { Users, Search, Plus, User, LogOut, Calendar } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function DesktopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, profile } = useAuthStore()

  const navItems = [
    { path: '/feed', icon: Users, label: 'Feed' },
    { path: '/people', icon: Search, label: 'People' },
    { path: '/activity', icon: Calendar, label: 'Activity' },
    { path: '/add', icon: Plus, label: 'Add Entry' },
    { path: '/profile', icon: User, label: 'Profile' },
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
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent cursor-pointer"
                onClick={() => navigate('/feed')}>
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right side - Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-sm font-medium text-white">{profile?.username}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
