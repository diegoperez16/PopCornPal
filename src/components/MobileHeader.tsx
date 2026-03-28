import { useNavigate } from 'react-router-dom'
import NotificationBell from './NotificationBell'

export default function MobileHeader() {
  const navigate = useNavigate()

  return (
    <header className="md:hidden sticky top-0 z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/[0.04] safe-area-top">
      <div className="flex items-center justify-between h-11 px-4">
        <button
          onClick={() => navigate('/feed')}
          className="outline-none"
        >
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">PopcornPal</span>
        </button>
        <NotificationBell />
      </div>
    </header>
  )
}
