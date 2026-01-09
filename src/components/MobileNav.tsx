import { Plus, User, Users, Calendar } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function MobileNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: '/feed', icon: Users, label: 'Feed' },
    { path: '/activity', icon: Calendar, label: 'Activity' },
    { path: '/add', icon: Plus, label: 'Add' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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
  )
}
