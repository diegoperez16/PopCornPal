import { useState } from 'react'
import { History, LogOut } from 'lucide-react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import NotificationBell from './NotificationBell'
import Brand from './brand/Brand'
import { prefetchRouteModule } from '../lib/routeLoaders'
import { navigation } from '../app/navigation'

export default function DesktopNav() {
  const [signOutError, setSignOutError] = useState('')
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-40 hidden border-b border-white/[0.07] bg-[#101113]/95 backdrop-blur-xl md:block">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-6 px-6">
        <Link to="/feed" aria-label="Popcorn Pal home">
          <Brand />
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {navigation.map(({ path, Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onPointerEnter={() => {
                void prefetchRouteModule(path)
              }}
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium ${isActive ? 'bg-white/[0.07] text-[#ff8175]' : 'text-gray-400 hover:text-white'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center">
          <Link
            to="/activity"
            className="app-icon-button"
            aria-label="Your activity"
          >
            <History size={19} />
          </Link>
          <NotificationBell />
          <button
            className="app-icon-button"
            aria-label="Sign out"
            onClick={async () => {
              try {
                await signOut()
                navigate('/auth')
              } catch {
                setSignOutError('Could not sign out. Please try again.')
              }
            }}
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>
      {signOutError && (
        <p role="alert" className="text-center text-sm text-rose-200 py-2">
          {signOutError}
        </p>
      )}
    </header>
  )
}
