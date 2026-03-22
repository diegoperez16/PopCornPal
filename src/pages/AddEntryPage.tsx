import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Film, Tv, Gamepad2, Book, Loader2, Plus, X, Star, Calendar } from 'lucide-react'
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
  
  // Initialize state
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
  useEffect(() => {
    localStorage.setItem('popcorn_add_tab', JSON.stringify(activeTab))
    localStorage.setItem('popcorn_add_query', JSON.stringify(query))
    localStorage.setItem('popcorn_add_results', JSON.stringify(results))
    localStorage.setItem('popcorn_add_selected', JSON.stringify(selectedItem))
    localStorage.setItem('popcorn_add_rating', JSON.stringify(rating))
    localStorage.setItem('popcorn_add_status', JSON.stringify(status))
    localStorage.setItem('popcorn_add_notes', JSON.stringify(notes))
  }, [activeTab, query, results, selectedItem, rating, status, notes])

  const clearPersistence = () => {
    localStorage.removeItem('popcorn_add_query')
    localStorage.removeItem('popcorn_add_results')
    localStorage.removeItem('popcorn_add_selected')
    localStorage.removeItem('popcorn_add_rating')
    localStorage.removeItem('popcorn_add_status')
    localStorage.removeItem('popcorn_add_notes')
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

  // Debounced Search Effect
  useEffect(() => {
    // Don't search if query is empty
    if (!query.trim()) {
      setResults([])
      setSearching(false)
      return
    }

    let isActive = true
    const timeoutId = setTimeout(async () => {
      setSearching(true)
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
        
        if (isActive) {
          setResults(data)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        if (isActive) {
          setSearching(false)
        }
      }
    }, 500) // 500ms debounce

    return () => {
      isActive = false
      clearTimeout(timeoutId)
    }
  }, [query, activeTab])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // The useEffect handles the search automatically
  }

  const handleSave = async () => {
    if (!selectedItem || !user) return

    setSaving(true)
    setDuplicateError(false)
    
    try {
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
        genre: null, 
        year: selectedItem.year ? parseInt(selectedItem.year) : null,
        cover_image_url: selectedItem.image || null
      })
      
      clearPersistence()
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
  }

  const tabs = [
    { id: 'movie', label: 'Movies', icon: Film, gradient: 'from-red-500 to-rose-600', glow: 'shadow-red-500/30' },
    { id: 'show', label: 'TV Shows', icon: Tv, gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/30' },
    { id: 'game', label: 'Games', icon: Gamepad2, gradient: 'from-blue-500 to-cyan-600', glow: 'shadow-blue-500/30' },
    { id: 'book', label: 'Books', icon: Book, gradient: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/30' },
  ] as const

  const activeTabData = tabs.find(t => t.id === activeTab)!
  const ActiveIcon = activeTabData.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-4 pt-6 pb-24">
      <div className="max-w-4xl mx-auto">

        {/* Type Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setResults([])
                  setQuery('')
                  setSelectedItem(null)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg ${tab.glow}`
                    : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${activeTabData.gradient} rounded-2xl blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-500`} />
            <div className="relative bg-gray-800/60 border border-gray-700/60 rounded-2xl flex items-center shadow-lg group-focus-within:border-gray-500 transition-colors">
              <div className="pl-4 text-gray-500 group-focus-within:text-white transition-colors flex-shrink-0">
                {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${activeTab}s…`}
                className="w-full bg-transparent border-none py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-base font-medium"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="mr-3 p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Results Grid */}
        {searching && results.length === 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] rounded-xl bg-gray-800" />
                <div className="h-2.5 bg-gray-800 rounded-full mt-2 mx-1" />
                <div className="h-2 bg-gray-800/60 rounded-full mt-1.5 mx-3" />
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {results.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item)
                  if (!selectedItem || selectedItem.id !== item.id) {
                    setRating(0)
                    setStatus('completed')
                    setNotes('')
                  }
                }}
                className="group relative cursor-pointer"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 shadow-md group-hover:shadow-xl group-hover:shadow-black/50 transition-all duration-300 group-hover:-translate-y-1 ring-1 ring-white/5 group-hover:ring-white/20 relative">
                  {item.image ? (
                    <img loading="lazy" decoding="async"
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-2 bg-gradient-to-br from-gray-800 to-gray-900">
                      <ActiveIcon className="w-8 h-8 opacity-30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-all duration-200">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 border border-white/30">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-300 mt-2 truncate px-0.5 group-hover:text-white transition-colors">{item.title}</p>
                <p className="text-[10px] text-gray-600 truncate px-0.5">{item.year || ''}</p>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && query && !searching && (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-gray-400 font-semibold">No results for "{query}"</p>
            <p className="text-gray-600 text-sm mt-1">Try different keywords</p>
          </div>
        )}

        {results.length === 0 && !query && !searching && (
          <div className="text-center py-24">
            <div className={`w-20 h-20 bg-gradient-to-br ${activeTabData.gradient} rounded-2xl flex items-center justify-center mx-auto mb-5 opacity-20`}>
              <ActiveIcon className="w-10 h-10 text-white" />
            </div>
            <p className="text-gray-400 font-semibold text-lg">Search for {activeTab}s</p>
            <p className="text-gray-600 text-sm mt-1">Find what you've been watching, playing, or reading</p>
          </div>
        )}

        {/* Detail Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-5xl rounded-2xl relative shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[calc(100vh-40px)]">

              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-3 right-3 z-30 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white/90 hover:text-white transition-colors border border-white/10 shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left: Poster */}
              <div className="w-full h-48 md:h-auto md:w-2/5 bg-black relative flex-shrink-0">
                {selectedItem.image ? (
                  <>
                    <div className="absolute inset-0 overflow-hidden">
                      <img loading="lazy" decoding="async" src={selectedItem.image} className="w-full h-full object-cover blur-2xl opacity-60 scale-125" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent md:bg-gradient-to-r" />
                    </div>
                    <div className="relative h-full w-full flex items-center justify-center p-6 md:p-8">
                      <img loading="lazy" decoding="async"
                        src={selectedItem.image}
                        alt={selectedItem.title}
                        className="h-full w-auto object-contain rounded-lg shadow-2xl border border-white/10 md:max-h-[80%] max-h-36"
                      />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800">
                    <Film className="w-16 h-16 opacity-20" />
                  </div>
                )}
              </div>

              {/* Right: Form */}
              <div className="flex-1 overflow-y-auto bg-gray-900 p-5 md:p-8 flex flex-col">
                <div className="mb-6 border-b border-gray-800 pb-6">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full bg-gradient-to-r ${activeTabData.gradient} text-[10px] font-bold uppercase tracking-wider text-white`}>
                      {selectedItem.type}
                    </span>
                    {selectedItem.year && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-800 rounded-md">
                        <Calendar className="w-3 h-3" />
                        {selectedItem.year}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3">
                    {selectedItem.title}
                  </h2>
                  {duplicateError && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
                      <span className="flex-shrink-0 mt-0.5">⚠️</span>
                      <div className="flex-1 text-sm">
                        <p className="font-medium mb-1">Already in your library</p>
                        <p className="text-red-400/80">"{selectedItem.title}" is already in your library. Try a different status.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Status */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Your Status</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'completed', label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                        { value: 'in-progress', label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                        { value: 'planned', label: 'Plan to', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                        { value: 'logged', label: 'Logged', color: 'text-gray-400', bg: 'bg-gray-800', border: 'border-gray-700' },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => {
                            setStatus(s.value as any)
                            if (s.value !== 'completed' && s.value !== 'logged') {
                              setRating(0)
                              setNotes('')
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium border transition-all duration-200 flex-1 md:flex-none text-center ${
                            status === s.value
                              ? `${s.bg} ${s.border} ${s.color} shadow-sm ring-1 ring-inset ring-white/10`
                              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  {(status === 'completed' || status === 'logged') && (
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rating</label>
                        <span className="text-xl font-bold text-white flex items-baseline gap-1">
                          {rating > 0 ? rating : '—'} <span className="text-gray-600 text-sm font-normal">/ 5</span>
                        </span>
                      </div>
                      <div className="flex gap-1 mb-4 justify-center md:justify-start">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-8 h-8 md:w-9 md:h-9 transition-colors cursor-pointer ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700 hover:text-yellow-400/50'}`}
                            onClick={() => setRating(star)}
                          />
                        ))}
                      </div>
                      <div className="relative w-full h-6 flex items-center">
                        <div className="absolute w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-400 transition-all duration-75 ease-out" style={{ width: `${(rating / 5) * 100}%` }} />
                        </div>
                        <input
                          type="range" min="0" max="10" step="1"
                          value={rating * 2}
                          onChange={(e) => setRating(parseFloat(e.target.value) / 2)}
                          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div
                          className="absolute h-5 w-5 bg-white border-2 border-yellow-400 rounded-full shadow-md pointer-events-none transition-all duration-75 ease-out"
                          style={{ left: `calc(${(rating / 5) * 100}% - 10px)` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {(status === 'completed' || status === 'logged') && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Your Review</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => { if (window.visualViewport) window.scrollTo(0, 0) }}
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none text-sm leading-relaxed"
                        placeholder="What did you think about it?"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full bg-gradient-to-r ${activeTabData.gradient} text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98]`}
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add to Library'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}