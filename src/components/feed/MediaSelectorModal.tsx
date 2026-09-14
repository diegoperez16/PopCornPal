import { useNavigate } from 'react-router-dom'
import { Film, Tv, Gamepad2, Book, Search } from 'lucide-react'
import Sheet from '../Sheet'
import VerdictMark from '../../features/verdict/VerdictMark'
import { verdictFor } from '../../features/verdict/verdictModel'
import { type MediaEntry } from '../../lib/supabase'

type MediaType = 'all' | 'movie' | 'show' | 'game' | 'book'

type MediaSelectorModalProps = {
  entries: MediaEntry[]
  mediaSearchQuery: string
  setMediaSearchQuery: (q: string) => void
  mediaFilterType: MediaType
  setMediaFilterType: (t: MediaType) => void
  onSelect: (entryId: string) => void
  onClose: () => void
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case 'movie': return Film
    case 'show': return Tv
    case 'game': return Gamepad2
    case 'book': return Book
    default: return Film
  }
}

export default function MediaSelectorModal({
  entries,
  mediaSearchQuery,
  setMediaSearchQuery,
  mediaFilterType,
  setMediaFilterType,
  onSelect,
  onClose,
}: MediaSelectorModalProps) {
  const navigate = useNavigate()

  return (
    <Sheet
      title="Attach a title"
      onClose={() => {
        onClose()
        setMediaSearchQuery('')
        setMediaFilterType('all')
      }}
    >
      <div className="app-search">
        <Search size={18} />
        <input
          type="search"
          value={mediaSearchQuery}
          onChange={(e) => setMediaSearchQuery(e.target.value)}
          placeholder="Search your library..."
          aria-label="Search your library"
          enterKeyHint="search"
          autoComplete="off"
          className="app-input"
          autoFocus
        />
      </div>

      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        {[
          { id: 'all', label: 'All' },
          { id: 'movie', label: 'Movies', icon: Film },
          { id: 'show', label: 'TV', icon: Tv },
          { id: 'game', label: 'Games', icon: Gamepad2 },
          { id: 'book', label: 'Books', icon: Book },
        ].map((type) => {
          const Icon = type.icon
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setMediaFilterType(type.id as MediaType)}
              aria-pressed={mediaFilterType === type.id}
              className="app-chip"
            >
              {Icon && <Icon size={16} />}
              {type.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-1">
        {entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">
            <p>Your library is empty.</p>
            <button
              type="button"
              onClick={() => { onClose(); navigate('/add') }}
              className="app-button-ghost mt-2 text-accent-soft"
            >
              Add your first entry
            </button>
          </div>
        ) : (() => {
          const filteredEntries = entries.filter((entry) => {
            const matchesType = mediaFilterType === 'all' || entry.media_type === mediaFilterType
            const matchesSearch = entry.title.toLowerCase().includes(mediaSearchQuery.toLowerCase())
            return matchesType && matchesSearch
          })

          if (filteredEntries.length === 0) {
            return (
              <div className="py-8 text-center text-sm text-muted">
                <p>No matches found.</p>
              </div>
            )
          }

          return filteredEntries.map((entry) => {
            const Icon = getMediaIcon(entry.media_type)
            const verdict = entry.rating ? verdictFor(entry.rating) : null
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  onSelect(entry.id)
                  setMediaSearchQuery('')
                  setMediaFilterType('all')
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-surface-strong"
              >
                <span className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken text-muted">
                  {entry.cover_image_url ? (
                    <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon size={16} />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-50">
                    {entry.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span className="capitalize">{entry.media_type}</span>
                    {entry.year && <span>{entry.year}</span>}
                    {verdict && (
                      <span className="flex items-center gap-1 tabular-nums" title={verdict.name}>
                        <VerdictMark verdict={verdict.id} size={16} />
                        {entry.rating}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            )
          })
        })()}
      </div>
    </Sheet>
  )
}
