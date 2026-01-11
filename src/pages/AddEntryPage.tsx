import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Film, Tv, Gamepad2, Book, Loader2, Plus, X, Star } from 'lucide-react'
import { api, type SearchResult } from '../lib/api'
import { useMediaStore } from '../store/mediaStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

type MediaType = 'movie' | 'show' | 'game' | 'book'

// Helper to safely parse JSON from localStorage
const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch (e) {
    return fallback
  }
}

export default function AddEntryPage() {
  const navigate = useNavigate()
  const { addEntry } = useMediaStore()
  const { user } = useAuthStore()
  
  // Initialize state from localStorage or defaults
  const [activeTab, setActiveTab] = useState<MediaType>(() => loadState('popcorn_add_tab', 'movie'))
  const [query, setQuery] = useState(() => loadState('popcorn_add_query', ''))
  const [results, setResults] = useState<SearchResult[]>(() => loadState('popcorn_add_results', []))
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(() => loadState('popcorn_add_selected', null))
  
  // Form State
  const [rating, setRating] = useState(() => loadState('popcorn_add_rating', 0))
  const [status, setStatus] = useState<'completed' | 'in-progress' | 'planned' | 'logged'>(() => loadState('popcorn_add_status', 'completed'))
  const [notes, setNotes] = useState(() => loadState('popcorn_add_notes', ''))
  
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicateError, setDuplicateError] = useState(false)

  // --- PERSISTENCE EFFECT ---
  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('popcorn_add_tab', JSON.stringify(activeTab))
    localStorage.setItem('popcorn_add_query', JSON.stringify(query))
    localStorage.setItem('popcorn_add_results', JSON.stringify(results))
    localStorage.setItem('popcorn_add_selected', JSON.stringify(selectedItem))
    localStorage.setItem('popcorn_add_rating', JSON.stringify(rating))
    localStorage.setItem('popcorn_add_status', JSON.stringify(status))
    localStorage.setItem('popcorn_add_notes', JSON.stringify(notes))
  }, [activeTab, query, results, selectedItem, rating, status, notes])

  // Clear persistence when successfully saved or manually cleared (optional, here we clear on success)
  const clearPersistence = () => {
    localStorage.removeItem('popcorn_add_query')
    localStorage.removeItem('popcorn_add_results')
    localStorage.removeItem('popcorn_add_selected')
    localStorage.removeItem('popcorn_add_rating')
    localStorage.removeItem('popcorn_add_status')
    localStorage.removeItem('popcorn_add_notes')
    // We keep 'popcorn_add_tab' as a user preference
  }

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
    if (!selectedItem || !user) return

    setSaving(true)
    setDuplicateError(false)
    
    try {
      // Only check for duplicates if adding to library (logged status)
      // Activity posts (completed, in-progress, planned) can have duplicates
      if (status === 'logged') {
        const { data: existingEntry } = await supabase
          .from('media_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('media_type', selectedItem.type)
          .eq('title', selectedItem.title)
          .eq('status', 'logged')
          .single()

        if (existingEntry) {
          setDuplicateError(true)
          setSaving(false)
          return
        }
      }

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
      
      // Clear draft on success
      clearPersistence()
      
      // Ensure mobile nav reappears
      setSelectedItem(null)
      navigate('/profile')
    } catch (error) {
      console.error('Error saving entry:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedItem(null)
    // Optional: Clear selection draft when closing modal explicitly?
    // For now we keep it so they can reopen if accidental close.
    // To clear just the selection: localStorage.removeItem('popcorn_add_selected')
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
            onClick={() => {
              clearPersistence() // Clear drafts if they cancel out
              navigate(-1)
            }}
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
                // Don't reset draft values if re-selecting the same item
                // But generally safer to reset form defaults for a new selection
                if (!selectedItem || selectedItem.id !== item.id) {
                    setRating(0)
                    setStatus('completed')
                    setNotes('')
                }
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
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold mb-1 pr-10 leading-tight">{selectedItem.title}</h2>
              <p className="text-gray-400 text-sm mb-6">{selectedItem.year} • {activeTab}</p>

              {/* Duplicate Error Alert */}
              {duplicateError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
                  <span className="text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
                  <div className="flex-1 text-sm">
                    <p className="font-medium mb-1">Already in your library</p>
                    <p className="text-red-400/80">"{selectedItem.title}" is already in your {activeTab} library. You can still add it as activity using other statuses.</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Status */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Status</label>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {[
                      { value: 'completed', label: 'Completed' },
                      { value: 'in-progress', label: 'In Progress' },
                      { value: 'planned', label: 'Plan to Watch' },
                      { value: 'logged', label: 'Library' },
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
                      Rating {rating > 0 && `(${rating}/5)`}
                    </label>
                    <div className="space-y-4">
                      {/* Star Display */}
                      <div className="flex gap-1 items-center justify-center">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = rating >= star
                          const isHalfFilled = rating >= star - 0.5 && rating < star
                          
                          return (
                            <div key={star} className="relative">
                              {/* Background star */}
                              <Star className="w-8 h-8 sm:w-9 sm:h-9 text-gray-700" />
                              {/* Filled overlay */}
                              {(isFilled || isHalfFilled) && (
                                <div
                                  className="absolute inset-0 overflow-hidden pointer-events-none"
                                  style={{ width: isHalfFilled ? '50%' : '100%' }}
                                >
                                  <Star className="w-8 h-8 sm:w-9 sm:h-9 fill-yellow-500 text-yellow-500" />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Improved Slider */}
                      <div className="relative w-full h-8 flex items-center">
                        {/* Custom Track Background */}
                        <div className="absolute w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                             {/* Filled part of the track */}
                             <div 
                                className="h-full bg-yellow-500 transition-all duration-75 ease-out"
                                style={{ width: `${(rating / 5) * 100}%` }}
                             />
                        </div>
                        
                        {/* Actual Range Input (Invisible but interactive) */}
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={rating * 2}
                          onChange={(e) => setRating(parseFloat(e.target.value) / 2)}
                          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        {/* Custom Thumb (Visual Only) */}
                        <div 
                            className="absolute h-5 w-5 bg-white border-2 border-yellow-500 rounded-full shadow-md pointer-events-none transition-all duration-75 ease-out"
                            style={{ 
                                left: `calc(${(rating / 5) * 100}% - 10px)` // Centered on value
                            }}
                        />
                      </div>
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