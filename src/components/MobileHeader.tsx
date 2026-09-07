import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import NotificationBell from './NotificationBell'
import Brand from './brand/Brand'

export default function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-40 border-b border-white/[0.06] bg-[#14181c]/95 backdrop-blur-xl safe-area-top">
      <div className="flex h-[68px] items-center justify-between px-5">
        <Link to="/feed" aria-label="Popcorn Pal home">
          <Brand />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/activity"
            aria-label="Your activity"
            className="app-icon-button"
          >
            <History size={20} />
          </Link>
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
