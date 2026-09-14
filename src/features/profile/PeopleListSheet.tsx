import Sheet from '../../components/Sheet'
import UserAvatar from '../../components/UserAvatar'
import PalMark from '../../components/brand/PalMark'
import type { AvatarCrop } from '../../lib/supabase'

export type ListedPerson = {
  id: string
  username: string
  full_name?: string | null
  avatar_url: string | null
  avatar_crop?: AvatarCrop | null
  isFollowing?: boolean
}

/**
 * Followers or following, as one sheet used by your own profile and by
 * anyone else's. Tapping a person opens their profile; the trailing button
 * follows or unfollows without leaving the list.
 */
export default function PeopleListSheet({
  title,
  people,
  loading,
  currentUserId,
  onClose,
  onOpenProfile,
  onToggleFollow,
}: {
  title: string
  people: readonly ListedPerson[]
  loading: boolean
  currentUserId?: string | null
  onClose: () => void
  onOpenProfile: (username: string) => void
  onToggleFollow?: (id: string, isFollowing: boolean) => void
}) {
  return (
    <Sheet title={title} size="narrow" onClose={onClose} bodyClassName="!px-0">
      {loading ? (
        <ul className="space-y-1 px-5 py-2" aria-label="Loading">
          {[0, 1, 2, 3].map((index) => (
            <li key={index} className="flex items-center gap-3 py-2 motion-safe:animate-pulse">
              <span className="h-10 w-10 rounded-full bg-surface-strong" />
              <span className="h-4 w-32 rounded bg-surface-strong" />
            </li>
          ))}
        </ul>
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <PalMark size={48} />
          <p className="mt-3 text-sm text-muted">
            {title === 'Followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line-soft">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-5 py-2">
              <button
                type="button"
                onClick={() => onOpenProfile(person.username)}
                aria-label={`Open @${person.username}`}
                className="app-avatar h-11 w-11 text-base"
              >
                <UserAvatar
                  avatarUrl={person.avatar_url}
                  avatarCrop={person.avatar_crop}
                  username={person.username}
                />
                {!person.avatar_url && person.username.charAt(0).toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => onOpenProfile(person.username)}
                className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
              >
                <span className="truncate text-sm font-semibold text-gray-50">@{person.username}</span>
                {person.full_name && (
                  <span className="truncate text-xs text-muted">{person.full_name}</span>
                )}
              </button>
              {onToggleFollow && currentUserId && currentUserId !== person.id && (
                <button
                  type="button"
                  onClick={() => onToggleFollow(person.id, Boolean(person.isFollowing))}
                  className={
                    person.isFollowing
                      ? 'app-button-secondary app-button-sm !rounded-full'
                      : 'app-button-primary app-button-sm !rounded-full'
                  }
                >
                  {person.isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
