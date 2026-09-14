type MentionUser = {
  username: string
  avatar_url: string | null
}

type Props = {
  users: MentionUser[]
  loading: boolean
  query: string
  selectedIndex: number
  onSelect: (username: string) => void
  position?: 'above' | 'below'
}

export default function MentionDropdown({ users, loading, query, selectedIndex, onSelect, position = 'above' }: Props) {
  if (!loading && users.length === 0) return null
  if (!loading && query.length === 0) return null

  const positionClass = position === 'below'
    ? 'absolute top-full left-0 right-0 mt-1'
    : 'absolute bottom-full left-0 right-0 mb-1'

  return (
    <div className={`${positionClass} z-50 overflow-hidden rounded-xl border border-line-soft bg-surface-strong shadow-2xl`}>
      {loading ? (
        <div className="px-4 py-3 text-sm text-muted">Searching...</div>
      ) : (
        users.map((user, i) => (
          <button
            key={user.username}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault() // Don't blur the textarea
              onSelect(user.username)
            }}
            className={`flex min-h-11 w-full items-center gap-3 px-4 text-left transition-colors ${
              i === selectedIndex ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'
            }`}
          >
            <span className="app-avatar h-7 w-7 text-xs">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" />
              ) : (
                <span>{user.username[0].toUpperCase()}</span>
              )}
            </span>
            <span className="text-sm font-medium text-gray-50">@{user.username}</span>
          </button>
        ))
      )}
    </div>
  )
}
