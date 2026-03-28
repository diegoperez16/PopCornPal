import { Plus, Home, Search, BookMarked, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/feed',    Icon: Home,       label: 'Home'     },
  { path: '/people',  Icon: Search,     label: 'Discover'  },
  // center slot reserved for the FAB
  { path: '/library', Icon: BookMarked, label: 'Library'   },
  { path: '/profile', Icon: User,       label: 'Profile'   },
]

export default function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="mobile-nav md:hidden fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl border-t border-white/[0.04] z-50 safe-area-bottom">
      {/* FAB — floats above the nav bar in the center */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6 z-10">
        <button
          onClick={() => navigate('/add')}
          aria-label="Add entry"
          className={`w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-pink-600 shadow-lg shadow-red-500/30 flex items-center justify-center transition-transform active:scale-90 ${
            location.pathname === '/add' ? 'ring-2 ring-white/20' : ''
          }`}
        >
          <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex items-center h-14 px-4">
        {/* Left two items */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-gray-600 active:text-gray-400'
              }`}
              aria-label={item.label}
            >
              <item.Icon
                className="w-[22px] h-[22px]"
                strokeWidth={isActive ? 2.5 : 1.5}
                fill={isActive ? 'currentColor' : 'none'}
              />
              {isActive && (
                <div className="w-1 h-1 mt-1.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full" />
              )}
            </button>
          )
        })}

        {/* Center spacer for FAB */}
        <div className="flex-1" />

        {/* Right two items */}
        {navItems.slice(2).map((item) => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-gray-600 active:text-gray-400'
              }`}
              aria-label={item.label}
            >
              <item.Icon
                className="w-[22px] h-[22px]"
                strokeWidth={isActive ? 2.5 : 1.5}
                fill={isActive ? 'currentColor' : 'none'}
              />
              {isActive && (
                <div className="w-1 h-1 mt-1.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
