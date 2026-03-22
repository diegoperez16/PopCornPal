import type { AvatarCrop } from '../lib/supabase'

interface UserAvatarProps {
  avatarUrl: string | null | undefined
  avatarCrop?: AvatarCrop | null
  username: string
  className?: string
}

/**
 * Renders a user avatar, applying CSS-based crop for GIFs when avatarCrop is present.
 * Must be placed inside a container that provides the size and overflow-hidden.
 * Returns null when no avatarUrl (parent container shows its fallback gradient/initial).
 */
export default function UserAvatar({ avatarUrl, avatarCrop, username, className = 'w-full h-full' }: UserAvatarProps) {
  if (!avatarUrl) return null

  if (avatarCrop) {
    return (
      <div
        className={className}
        style={{
          backgroundImage: `url(${avatarUrl})`,
          backgroundSize: `${avatarCrop.scale}%`,
          backgroundPosition: `${avatarCrop.x}% ${avatarCrop.y}%`,
          backgroundRepeat: 'no-repeat',
        }}
      />
    )
  }

  return (
    <img
      loading="lazy"
      decoding="async"
      src={avatarUrl}
      alt={username}
      className={`${className} object-cover`}
    />
  )
}
