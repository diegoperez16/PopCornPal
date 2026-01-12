import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore, type MediaEntry } from '../store/mediaStore'
import { useNavigate } from 'react-router-dom'
import { Film, Tv, Gamepad2, Book, Star, Edit2, X, Trash2, Loader2, Search, Library, Calendar, Tag, Clock } from 'lucide-react'

export default function LibraryPage() {
  const { user } = useAuthStore()
  const { entries, fetchEntries, updateEntry, deleteEntry } = useMediaStore()
  const navigate = useNavigate()
  
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [filterType, setFilterType] = useState<'movie' | 'show' | 'game' | 'book' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Edit Entry Form State
  const [editRating, setEditRating] = useState(0)
  const [editStatus, setEditStatus] = useState<'completed' | 'in-progress' | 'planned' | 'logged'>('logged')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    if (user) {
      fetchEntries(user.id)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchEntries(user.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, fetchEntries])

  // Initialize edit form when entry is selected
  useEffect(() => {
    if (selectedEntry) {
      setEditRating(selectedEntry.rating || 0)
      setEditStatus(selectedEntry.status)
      setEditNotes(selectedEntry.notes || '')
    }
  }, [selectedEntry])

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return
    setIsUpdating(true)
    try {
      await updateEntry(selectedEntry.id, {
        rating: editRating || null,
        status: editStatus,
        notes: editNotes.trim() || null,
        completed_date: editStatus === 'completed' && selectedEntry.status !== 'completed' 
          ? new Date().toISOString().split('T')[0] 
          : selectedEntry.completed_date
      })
      setSelectedEntry(null)
    } catch (error) {
      console.error('Error updating entry:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteEntry = async () => {
    if (!selectedEntry || !confirm('Are you sure you want to delete this entry?')) return
    setIsUpdating(true)
    try {
      await deleteEntry(selectedEntry.id)
      setSelectedEntry(null)
    } catch (error) {
      console.error('Error deleting entry:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'movie': return Film
      case 'show': return Tv
      case 'game': return Gamepad2
      case 'book': return Book
      default: return Film
    }
  }

  // Filter and deduplicate library entries
  const libraryEntries = (() => {
    let filtered = entries.filter(e => e.status === 'logged')

    if (filterType) {
      filtered = filtered.filter(e => e.media_type === filterType)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e => e.title.toLowerCase().includes(query))
    }
    
    const uniqueEntries = new Map<string, MediaEntry>()
    filtered.forEach(entry => {
      const key = `${entry.media_type}-${entry.title.toLowerCase()}`
      const existing = uniqueEntries.get(key)
      if (!existing || new Date(entry.updated_at) > new Date(existing.updated_at)) {
        uniqueEntries.set(key, entry)
      }
    })
    
    return Array.from(uniqueEntries.values())
  })()

  const getUniqueLoggedCount = (mediaType: 'movie' | 'show' | 'game' | 'book') => {
    const loggedEntries = entries.filter(e => e.media_type === mediaType && e.status === 'logged')
    const uniqueEntries = new Set(loggedEntries.map(e => `${e.media_type}-${e.title.toLowerCase()}`))
    return uniqueEntries.size
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <div className="text-white text-xl">Loading library...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              <Library className="w-8 h-8 text-red-500" />
              My Library
            </h1>
            <p className="text-gray-400 text-lg">Your curated collection of media.</p>
          </div>

          <div className="relative w-full md:w-80 group">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles, genres..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Filter Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Movies', count: getUniqueLoggedCount('movie'), icon: Film, type: 'movie' as const, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            { label: 'Shows', count: getUniqueLoggedCount('show'), icon: Tv, type: 'show' as const, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            { label: 'Games', count: getUniqueLoggedCount('game'), icon: Gamepad2, type: 'game' as const, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'Books', count: getUniqueLoggedCount('book'), icon: Book, type: 'book' as const, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setFilterType(filterType === stat.type ? null : stat.type)}
              className={`
                relative overflow-hidden rounded-2xl p-4 transition-all duration-300 group text-left border
                ${filterType === stat.type 
                  ? `${stat.bg} ${stat.border} ring-1 ring-white/10 shadow-lg scale-[1.02]` 
                  : 'bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/80 hover:border-gray-600'}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${filterType === stat.type ? 'bg-black/20' : 'bg-gray-700/50 group-hover:bg-gray-700'} transition-colors`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className="text-3xl font-bold text-white tracking-tight">{stat.count}</span>
              </div>
              <div className={`text-sm font-medium ${filterType === stat.type ? 'text-white' : 'text-gray-400'}`}>
                {stat.label}
              </div>
            </button>
          ))}
        </div>

        {/* Library Grid */}
        {libraryEntries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10 animate-in fade-in duration-500">
            {libraryEntries.map((entry) => {
              const Icon = getIcon(entry.media_type)
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="group relative flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 shadow-lg transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-black/50 group-hover:-translate-y-2 ring-1 ring-white/10 group-hover:ring-white/20">
                    {entry.cover_image_url ? (
                      <img 
                        src={entry.cover_image_url} 
                        alt={entry.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-3 bg-gradient-to-br from-gray-800 to-gray-900">
                        <Icon className="w-12 h-12 opacity-30" />
                        <span className="text-xs uppercase font-bold tracking-widest opacity-30">{entry.media_type}</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                      <div className="bg-white/10 p-3.5 rounded-full border border-white/20 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Edit2 className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {entry.rating && (
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10 shadow-lg">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs font-bold text-white">{entry.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 px-1">
                    <h4 className="text-base font-bold text-gray-100 line-clamp-1 group-hover:text-red-400 transition-colors" title={entry.title}>
                      {entry.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="capitalize">{entry.media_type}</span>
                      {entry.year && (
                        <>
                          <span>•</span>
                          <span>{entry.year}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
            <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 ring-4 ring-gray-800">
              {searchQuery ? <Search className="w-10 h-10 text-gray-500" /> : <Book className="w-10 h-10 text-gray-500" />}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {searchQuery ? `No matches for "${searchQuery}"` : 'Your library is looking empty'}
            </h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8 text-lg">
              {searchQuery 
                ? 'Try checking your spelling or use different keywords.' 
                : 'Start logging movies, shows, games, and books to build your collection.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('/add')}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                Add Your First Entry
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-red-400 hover:text-red-300 font-medium hover:underline underline-offset-4"
              >
                Clear search criteria
              </button>
            )}
          </div>
        )}
      </main>

      {/* --- RESPONSIVE SPLIT-VIEW MODAL --- */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl rounded-2xl relative shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[calc(100vh-40px)]">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-3 right-3 z-30 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white/90 hover:text-white transition-colors border border-white/10 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* --- LEFT (Desktop) / TOP (Mobile): Poster & Backdrop --- */}
            <div className="w-full h-48 md:h-auto md:w-2/5 bg-black relative flex-shrink-0">
              {selectedEntry.cover_image_url ? (
                <>
                  {/* Blurred Backdrop */}
                  <div className="absolute inset-0 overflow-hidden">
                    <img src={selectedEntry.cover_image_url} className="w-full h-full object-cover blur-2xl opacity-60 scale-125" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent md:bg-gradient-to-r" />
                  </div>
                  
                  {/* Actual Poster Image */}
                  <div className="relative h-full w-full flex items-center justify-center p-6 md:p-8">
                    <img 
                      src={selectedEntry.cover_image_url} 
                      alt={selectedEntry.title} 
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
              
              {/* Media Information Section */}
              <div className="mb-8 border-b border-gray-800 pb-6">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                    {selectedEntry.media_type}
                  </span>
                  {selectedEntry.year && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-800 rounded-md">
                      <Calendar className="w-3 h-3" />
                      {selectedEntry.year}
                    </span>
                  )}
                  {selectedEntry.genre && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-800 rounded-md">
                      <Tag className="w-3 h-3" />
                      {selectedEntry.genre}
                    </span>
                  )}
                </div>
                
                <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-3">
                  {selectedEntry.title}
                </h2>
              </div>

              {/* User Input Section */}
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
                        onClick={() => setEditStatus(s.value as any)}
                        className={`
                          px-3 py-2 rounded-lg text-xs md:text-sm font-medium border transition-all duration-200 flex-1 md:flex-none text-center
                          ${editStatus === s.value
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
                {(editStatus === 'completed' || editStatus === 'logged') && (
                  <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Rating</label>
                      <span className="text-xl font-bold text-white flex items-baseline gap-1">
                        {editRating > 0 ? editRating : '-'} <span className="text-gray-600 text-sm font-normal">/ 5</span>
                      </span>
                    </div>
                    
                    {/* Star Display (Visual + Click) */}
                    <div className="flex gap-1 mb-4 justify-center md:justify-start">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-8 h-8 md:w-9 md:h-9 transition-colors cursor-pointer ${editRating >= star ? 'text-yellow-400 fill-yellow-400' : editRating >= star - 0.5 ? 'text-yellow-400 fill-yellow-400/50' : 'text-gray-700'}`} 
                          onClick={() => setEditRating(star)} 
                        />
                      ))}
                    </div>
                    
                    {/* Smooth Slider Control */}
                    <div className="relative w-full h-6 flex items-center group">
                      {/* Track */}
                      <div className="absolute w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-yellow-400 transition-all duration-75 ease-out"
                              style={{ width: `${(editRating / 5) * 100}%` }}
                           />
                      </div>
                      {/* Invisible Input for interaction */}
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={editRating * 2}
                        onChange={(e) => setEditRating(parseFloat(e.target.value) / 2)}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      {/* Thumb Visual */}
                      <div 
                          className="absolute h-5 w-5 bg-white border-2 border-yellow-400 rounded-full shadow-md pointer-events-none transition-all duration-75 ease-out"
                          style={{ 
                              left: `calc(${(editRating / 5) * 100}% - 10px)` 
                          }}
                      />
                    </div>
                  </div>
                )}

                {/* Notes / Review */}
                {(editStatus === 'completed' || editStatus === 'logged') && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Your Review</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none text-sm leading-relaxed"
                      placeholder="What did you think about it?"
                    />
                  </div>
                )}

                {/* Metadata Footer */}
                <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-800 pt-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Updated: {new Date(selectedEntry.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2 mt-auto">
                  <button
                    onClick={handleDeleteEntry}
                    disabled={isUpdating}
                    className="px-4 py-3 rounded-xl border border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors disabled:opacity-50"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleUpdateEntry}
                    disabled={isUpdating}
                    className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                  >
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Edit2 className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}