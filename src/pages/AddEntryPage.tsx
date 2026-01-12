import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Film, Tv, Gamepad2, Book, Loader2, Plus, X, Star, Calendar, Tag } from 'lucide-react'
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
              clearPersistence()
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

        {/* Search - SLEEKER & RESPONSIVE */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search for ${activeTab}s...`}
                className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl focus:outline-none focus:border-red-500 transition-colors text-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="bg-gray-700 hover:bg-gray-600 h-[56px] w-[56px] flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 mt-2 sm:mt-0"
              tabIndex={0}
              aria-label="Search"
            >
              {searching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-7 h-7 text-white" />}
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

        {/* --- NEW RESPONSIVE MODAL --- */}
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl rounded-2xl relative shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[calc(100vh-40px)]">
              
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-3 right-3 z-30 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white/90 hover:text-white transition-colors border border-white/10 shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {/* --- LEFT (Desktop) / TOP (Mobile): Poster & Backdrop --- */}
              <div className="w-full h-48 md:h-auto md:w-2/5 bg-black relative flex-shrink-0">
                {selectedItem.image ? (
                  <>
                    {/* Blurred Backdrop */}
                    <div className="absolute inset-0 overflow-hidden">
                      <img src={selectedItem.image} className="w-full h-full object-cover blur-2xl opacity-60 scale-125" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent md:bg-gradient-to-r" />
                    </div>
                    
                    {/* Actual Poster Image */}
                    <div className="relative h-full w-full flex items-center justify-center p-6 md:p-8">
                      <img 
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

              {/* --- RIGHT (Desktop) / BOTTOM (Mobile): Details & Form --- */}
              <div className="flex-1 overflow-y-auto bg-gray-900 p-5 md:p-8 flex flex-col">
                
                {/* Media Info Section */}
                <div className="mb-8 border-b border-gray-800 pb-6">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
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
                  
                  {/* Duplicate Error Alert */}
                  {duplicateError && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 flex items-start gap-3">
                      <span className="text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
                      <div className="flex-1 text-sm">
                        <p className="font-medium mb-1">Already in your library</p>
                        <p className="text-red-400/80">"{selectedItem.title}" is already in your library. Try a different status.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Section */}
                <div className="space-y-6">
                  {/* Status Selector */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Your Status</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'completed', label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                        { value: 'in-progress', label: 'In-progress', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                        { value: 'planned', label: 'Plan to Watch', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
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
                          className={`
                            px-3 py-2 rounded-lg text-xs md:text-sm font-medium border transition-all duration-200 flex-1 md:flex-none text-center
                            ${status === s.value
                              ? `${s.bg} ${s.border} ${s.color} shadow-sm ring-1 ring-inset ring-white/10`
                              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'}
                          `}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating with Slider & Stars */}
                  {(status === 'completed' || status === 'logged') && (
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rating</label>
                        <span className="text-xl font-bold text-white flex items-baseline gap-1">
                          {rating > 0 ? rating : '-'} <span className="text-gray-600 text-sm font-normal">/ 5</span>
                        </span>
                      </div>
                      
                      {/* Star Display (Visual + Click) */}
                      <div className="flex gap-1 mb-4 justify-center md:justify-start">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-8 h-8 md:w-9 md:h-9 transition-colors cursor-pointer ${rating >= star ? 'text-yellow-400 fill-yellow-400' : rating >= star - 0.5 ? 'text-yellow-400 fill-yellow-400/50' : 'text-gray-700'}`} 
                            onClick={() => setRating(star)} 
                          />
                        ))}
                      </div>
                      
                      {/* Smooth Slider Control */}
                      <div className="relative w-full h-6 flex items-center group">
                        {/* Track */}
                        <div className="absolute w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-yellow-400 transition-all duration-75 ease-out"
                                style={{ width: `${(rating / 5) * 100}%` }}
                             />
                        </div>
                        {/* Invisible Input for interaction */}
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={rating * 2}
                          onChange={(e) => setRating(parseFloat(e.target.value) / 2)}
                          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {/* Thumb Visual */}
                        <div 
                            className="absolute h-5 w-5 bg-white border-2 border-yellow-400 rounded-full shadow-md pointer-events-none transition-all duration-75 ease-out"
                            style={{ 
                                left: `calc(${(rating / 5) * 100}% - 10px)` 
                            }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes / Review */}
                  {(status === 'completed' || status === 'logged') && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Your Review</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => {
                          if (window.visualViewport) window.scrollTo(0, 0)
                        }}
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none text-sm leading-relaxed"
                        placeholder="What did you think about it?"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-900/20 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
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