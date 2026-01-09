import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore, type MediaEntry } from '../store/mediaStore'
import { useNavigate } from 'react-router-dom'
import { Film, Tv, Gamepad2, Book, Star, Edit2, X, Trash2, Loader2 } from 'lucide-react'

export default function LibraryPage() {
  const { user } = useAuthStore()
  const { entries, fetchEntries, updateEntry, deleteEntry } = useMediaStore()
  const navigate = useNavigate()
  
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [filterType, setFilterType] = useState<'movie' | 'show' | 'game' | 'book' | null>(null)
  
  // Edit Entry Form State
  const [editRating, setEditRating] = useState(0)
  const [editStatus, setEditStatus] = useState<'completed' | 'in-progress' | 'planned' | 'logged'>('logged')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    if (user) {
      fetchEntries(user.id)
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

  const libraryEntries = entries.filter(e => e.status === 'logged' && (!filterType || e.media_type === filterType))

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-700 border-t-red-500 rounded-full animate-spin mb-4"></div>
          <div className="text-white text-xl mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Library</h1>
          <p className="text-gray-400">Media you've consumed (without specific dates)</p>
        </div>

        {/* Stats Filter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Movies', count: entries.filter(e => e.media_type === 'movie' && e.status === 'logged').length, icon: Film, type: 'movie' as const },
            { label: 'Shows', count: entries.filter(e => e.media_type === 'show' && e.status === 'logged').length, icon: Tv, type: 'show' as const },
            { label: 'Games', count: entries.filter(e => e.media_type === 'game' && e.status === 'logged').length, icon: Gamepad2, type: 'game' as const },
            { label: 'Books', count: entries.filter(e => e.media_type === 'book' && e.status === 'logged').length, icon: Book, type: 'book' as const },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setFilterType(filterType === stat.type ? null : stat.type)}
              className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-4 hover:bg-gray-800/70 transition-all ${
                filterType === stat.type ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-5 h-5 text-gray-400" />
                <span className="text-2xl font-bold text-white">{stat.count}</span>
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </button>
          ))}
        </div>

        {/* Library Grid */}
        {libraryEntries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {libraryEntries.map((entry) => {
              const Icon = getIcon(entry.media_type)
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden hover:bg-gray-800/50 transition-colors cursor-pointer group"
                >
                  <div className="aspect-[2/3] bg-gray-900 relative">
                    {entry.cover_image_url ? (
                      <img src={entry.cover_image_url} alt={entry.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <Icon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Edit2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-semibold line-clamp-2 text-white mb-1">{entry.title}</h4>
                    {entry.rating && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-gray-400">{entry.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
              <Book className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No library entries yet</h3>
            <p className="text-gray-400 mb-6">Add media you've consumed without specific dates to your library.</p>
            <button
              onClick={() => navigate('/add')}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg shadow-red-500/20"
            >
              Add to Library
            </button>
          </div>
        )}
      </main>

      {/* Edit Entry Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-1 pr-8 leading-tight">{selectedEntry.title}</h2>
            <p className="text-gray-400 text-sm mb-6 capitalize">{selectedEntry.media_type}</p>

            <div className="space-y-4 sm:space-y-6">
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
                      onClick={() => setEditStatus(s.value as any)}
                      className={`py-2 px-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors ${
                        editStatus === s.value
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
              {(editStatus === 'completed' || editStatus === 'logged') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Rating {editRating > 0 && `(${editRating}/5)`}
                  </label>
                  <div className="space-y-3">
                    {/* Star Display */}
                    <div className="flex gap-1 items-center justify-center">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = editRating >= star
                        const isHalfFilled = editRating >= star - 0.5 && editRating < star
                        
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
                    {/* Slider */}
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={editRating * 2}
                      onChange={(e) => setEditRating(parseFloat(e.target.value) / 2)}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #eab308 0%, #eab308 ${(editRating / 5) * 100}%, #374151 ${(editRating / 5) * 100}%, #374151 100%)`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Notes - show if completed or logged */}
              {(editStatus === 'completed' || editStatus === 'logged') && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 sm:px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm sm:text-base"
                    placeholder="Your thoughts..."
                    style={{ fontSize: '16px' }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateEntry}
                  disabled={isUpdating}
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-4 py-2.5 sm:py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50 text-sm sm:text-base"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  onClick={handleDeleteEntry}
                  disabled={isUpdating}
                  className="px-4 py-2.5 sm:py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
