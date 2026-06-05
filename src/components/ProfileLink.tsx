import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { prefetchUserProfile } from '../hooks/queries/useProfileQueries'

type ProfileLinkProps = {
  username: string
  currentUserId?: string | null
  className?: string
  onClick?: () => void
  children: ReactNode
}

export default function ProfileLink({ username, currentUserId = null, className, onClick, children }: ProfileLinkProps) {
  const prefetch = () => { void prefetchUserProfile(username, currentUserId) }
  return (
    <Link
      to={`/profile/${username}`}
      className={className}
      onClick={onClick}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
    >
      {children}
    </Link>
  )
}
