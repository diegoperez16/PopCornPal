import { useNavigate } from 'react-router-dom'
import { X, Film, Tv, Gamepad2, Book, Search, Star } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl flex flex-col max-h-[85vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Select Media</h3>
          <button
            onClick={() => {
              onClose()
              setMediaSearchQuery('')
              setMediaFilterType('all')
            }}
            className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={mediaSearchQuery}
              onChange={(e) => setMediaSearchQuery(e.target.value)}
              placeholder="Search your library..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              autoFocus
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
                  onClick={() => setMediaFilterType(type.id as MediaType)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                    mediaFilterType === type.id
                      ? 'bg-red-500/10 border-red-500/50 text-red-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {type.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Your library is empty.</p>
              <button
                onClick={() => { onClose(); navigate('/add') }}
                className="mt-2 text-red-400 hover:text-red-300 text-sm font-medium"
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
                <div className="text-center py-8 text-gray-500">
                  <p>No matches found.</p>
                </div>
              )
            }

            return filteredEntries.map((entry) => {
              const Icon = getMediaIcon(entry.media_type)
              return (
                <button
                  key={entry.id}
                  onClick={() => {
                    onSelect(entry.id)
                    setMediaSearchQuery('')
                    setMediaFilterType('all')
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800 transition-colors text-left group border border-transparent hover:border-gray-700"
                >
                  <div className="w-10 h-14 bg-gray-800 rounded flex-shrink-0 overflow-hidden relative">
                    {entry.cover_image_url ? (
                      <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                      {entry.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="capitalize">{entry.media_type}</span>
                      {entry.year && <span>• {entry.year}</span>}
                      {entry.rating && (
                        <span className="flex items-center gap-1 text-yellow-500/80">
                          • <Star className="w-3 h-3 fill-current" /> {entry.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center group-hover:border-red-500 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}
