import { Users, Search, Plus, Calendar, LogOut, RefreshCw, Popcorn } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import NotificationBell from './NotificationBell'
import UserAvatar from './UserAvatar'

export default function DesktopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, profile } = useAuthStore(useShallow(s => ({ signOut: s.signOut, profile: s.profile })))
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    if (refreshing) return
    setRefreshing(true)
    queryClient.invalidateQueries().finally(() => setRefreshing(false))
  }

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
    <nav className="hidden md:block bg-gray-900/95 backdrop-blur-lg border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/feed')}
              className="flex items-center gap-2 outline-none focus:outline-none"
            >
              <Popcorn className="w-5 h-5 text-rose-500" />
              <span className="font-bold text-sm tracking-tight text-white">PopcornPal</span>
            </button>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-white bg-white/8'
                        : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-400' : ''}`} />
            </button>
            <NotificationBell />

            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              title={profile?.username}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden">
                <UserAvatar avatarUrl={profile?.avatar_url} avatarCrop={profile?.avatar_crop} username={profile?.username ?? ''} />
                {!profile?.avatar_url && (profile?.username?.[0] ?? '?').toUpperCase()}
              </div>
              <span className="text-sm text-gray-400">{profile?.username}</span>
            </button>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
