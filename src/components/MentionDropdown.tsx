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
    <div className={`${positionClass} bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl z-50`}>
      {loading ? (
        <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
      ) : (
        users.map((user, i) => (
          <button
            key={user.username}
            onMouseDown={(e) => {
              e.preventDefault() // Don't blur the textarea
              onSelect(user.username)
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
              i === selectedIndex ? 'bg-gray-700' : 'hover:bg-gray-700/50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#2c3440] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{user.username[0].toUpperCase()}</span>
              )}
            </div>
            <span className="text-sm text-white font-medium">@{user.username}</span>
          </button>
        ))
      )}
    </div>
  )
}
