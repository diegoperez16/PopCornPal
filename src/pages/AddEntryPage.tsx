import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Film, Tv, Gamepad2, Book, Loader2, Plus, X, Star } from 'lucide-react'
import { api, type SearchResult } from '../lib/api'
import { useMediaStore } from '../store/mediaStore'

type MediaType = 'movie' | 'show' | 'game' | 'book'

export default function AddEntryPage() {
  const navigate = useNavigate()
  const { addEntry } = useMediaStore()
  
  const [activeTab, setActiveTab] = useState<MediaType>('movie')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null)
  
  // Form State
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState<'completed' | 'in-progress' | 'planned' | 'logged'>('completed')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Hide mobile nav when modal is open
  useEffect(() => {
    const mobileNav = document.querySelector('.mobile-nav')
    if (mobileNav) {
      if (selectedItem) {
        mobileNav.classList.add('hidden')
      } else {
        mobileNav.classList.remove('hidden')
      }
    }
  }, [selectedItem])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setResults([])
    try {
      let data: SearchResult[] = []
      switch (activeTab) {
        case 'movie':
          data = await api.searchMovies(query)
          break
        case 'show':
          data = await api.searchShows(query)
          break
        case 'game':
          data = await api.searchGames(query)
          break
        case 'book':
          data = await api.searchBooks(query)
          break
      }
      setResults(data)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async () => {
    if (!selectedItem) return

    setSaving(true)
    try {
      await addEntry({
        media_type: selectedItem.type,
        title: selectedItem.title,
        rating: rating || null,
        status,
        completed_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null,
        notes: notes.trim() || null,
        genre: null, // API doesn't always provide simple genre string, skipping for now
        year: selectedItem.year ? parseInt(selectedItem.year) : null,
        cover_image_url: selectedItem.image || null
      })
      // Ensure mobile nav reappears
      setSelectedItem(null)
      navigate('/profile')
    } catch (error) {
      console.error('Error saving entry:', error)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'movie', label: 'Movies', icon: Film },
    { id: 'show', label: 'TV Shows', icon: Tv },
    { id: 'game', label: 'Games', icon: Gamepad2 },
    { id: 'book', label: 'Books', icon: Book },
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 pb-20">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add New Entry</h1>
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setResults([])
                setQuery('')
                setSelectedItem(null)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search for ${activeTab}s...`}
              className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:border-red-500 transition-colors text-lg"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>

        {/* Results */}
        <div className="space-y-4">
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedItem(item)
                setRating(0)
                setStatus('completed')
                setNotes('')
              }}
              className="flex gap-4 p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl hover:bg-gray-800/50 transition-colors cursor-pointer group"
            >
              <div className="w-20 h-28 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 relative">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    {(() => {
                      const Icon = tabs.find(t => t.id === activeTab)?.icon
                      return Icon ? <Icon className="w-8 h-8" /> : null
                    })()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Plus className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate pr-4">{item.title}</h3>
                <p className="text-gray-400 text-sm mb-2">{item.year || 'Unknown Year'}</p>
                <p className="text-gray-500 text-sm line-clamp-2">{item.description}</p>
              </div>
            </div>
          ))}
          
          {results.length === 0 && query && !searching && (
            <div className="text-center text-gray-500 py-12">
              No results found. Try a different search.
            </div>
          )}
        </div>

        {/* Selection Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 relative animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold mb-1 pr-10 leading-tight">{selectedItem.title}</h2>
              <p className="text-gray-400 text-sm mb-6">{selectedItem.year} • {activeTab}</p>

              <div className="space-y-6">
                {/* Status */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Status</label>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {[
                      { value: 'completed', label: 'Completed' },
                      { value: 'in-progress', label: 'In Progress' },
                      { value: 'planned', label: 'Plan to Watch' },
                      { value: 'logged', label: 'Logged' },
                    ].map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          setStatus(s.value as any)
                          // Clear rating and notes if not completed or logged
                          if (s.value !== 'completed' && s.value !== 'logged') {
                            setRating(0)
                            setNotes('')
                          }
                        }}
                        className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${
                          status === s.value
                            ? 'bg-red-500/10 border-red-500 text-red-500'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating - show if completed or logged */}
                {(status === 'completed' || status === 'logged') && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                      Rating (tap to select, drag to adjust)
                    </label>
                    <div className="flex gap-0.5 sm:gap-1 items-center">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = rating >= star
                        const isHalfFilled = rating >= star - 0.5 && rating < star
                        
                        return (
                          <div key={star} className="relative">
                            <button
                              onClick={() => setRating(star === rating ? 0 : star)}
                              onMouseDown={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                const x = e.clientX - rect.left
                                const isLeftHalf = x < rect.width / 2
                                setRating(isLeftHalf ? star - 0.5 : star)
                              }}
                              onTouchStart={(e) => {
                                const touch = e.touches[0]
                                const rect = e.currentTarget.getBoundingClientRect()
                                const x = touch.clientX - rect.left
                                const isLeftHalf = x < rect.width / 2
                                setRating(isLeftHalf ? star - 0.5 : star)
                              }}
                              className="focus:outline-none relative"
                            >
                              {/* Background star */}
                              <Star className="w-7 h-7 sm:w-8 sm:h-8 text-gray-700" />
                              {/* Filled overlay */}
                              {(isFilled || isHalfFilled) && (
                                <div
                                  className="absolute inset-0 overflow-hidden"
                                  style={{ width: isHalfFilled ? '50%' : '100%' }}
                                >
                                  <Star className="w-7 h-7 sm:w-8 sm:h-8 fill-yellow-500 text-yellow-500" />
                                </div>
                              )}
                            </button>
                          </div>
                        )
                      })}
                      {rating > 0 && (
                        <span className="ml-2 text-sm text-gray-400">{rating}/5</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes - show if completed or logged */}
                {(status === 'completed' || status === 'logged') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={() => {
                        // Auto zoom-out on iOS when user finishes typing
                        if (window.visualViewport) {
                          window.scrollTo(0, 0)
                        }
                      }}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-base focus:outline-none focus:border-red-500 transition-colors"
                      placeholder="What did you think?"
                    />
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-3.5 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add to Library'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
