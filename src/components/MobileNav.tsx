import { Plus, User, Users, Calendar, LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useState } from 'react'

export default function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, profile } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)

  const navItems = [
    { path: '/feed', icon: Users, label: 'Feed' },
    { path: '/activity', icon: Calendar, label: 'Activity' },
    { path: '/add', icon: Plus, label: 'Add' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  const handleLogout = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <>
      {/* Logout Menu Overlay */}
      {showMenu && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMenu(false)}
        >
          <div 
            className="absolute bottom-16 right-4 bg-gray-800 rounded-lg border border-gray-700 shadow-xl p-2 min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-gray-700">
              <p className="text-sm text-gray-400">Signed in as</p>
              <p className="text-white font-semibold">@{profile?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-700 rounded transition-colors mt-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          
          return (
            <button
              key={item.path}
              onClick={() => {
                if (item.path === '/profile') {
                  setShowMenu(!showMenu)
                } else {
                  navigate(item.path)
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                isActive 
                  ? 'text-white' 
                  : 'text-gray-500 active:scale-95'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''}`}>
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full" />
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${
                isActive ? 'text-white' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
    </>
  )
}
