import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore, type MediaEntry } from '../store/mediaStore'
import { useNavigate } from 'react-router-dom'
import { Film, Tv, Gamepad2, Book, Star, Calendar, Clock } from 'lucide-react'

interface GroupedEntries {
  [date: string]: MediaEntry[]
}

export default function ActivityPage() {
  const { user } = useAuthStore()
  const { entries, fetchEntries } = useMediaStore()
  const navigate = useNavigate()
  const [groupedEntries, setGroupedEntries] = useState<GroupedEntries>({})

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    fetchEntries(user.id)

    // Handle tab visibility - immediately refetch when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchEntries(user.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, navigate, fetchEntries])

  useEffect(() => {
    // Group entries by date, excluding 'logged' status entries
    const grouped: GroupedEntries = {}
    entries
      .filter(entry => entry.status !== 'logged')
      .forEach(entry => {
        const date = new Date(entry.created_at).toISOString().split('T')[0]
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(entry)
      })
    
    // Sort entries within each day by time (newest first)
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })
    
    setGroupedEntries(grouped)
  }, [entries])

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'movie': return Film
      case 'show': return Tv
      case 'game': return Gamepad2
      case 'book': return Book
      default: return Film
    }
  }

  const getMediaColor = (type: string) => {
    switch (type) {
      case 'movie': return 'from-red-500/20 to-orange-500/20 border-red-500/30'
      case 'show': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30'
      case 'game': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30'
      case 'book': return 'from-green-500/20 to-emerald-500/20 border-green-500/30'
      default: return 'from-gray-500/20 to-gray-500/20 border-gray-500/30'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const dateStr = date.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    if (dateStr === todayStr) return 'Today'
    if (dateStr === yesterdayStr) return 'Yesterday'
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">Completed</span>
      case 'in-progress':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">In Progress</span>
      case 'planned':
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full">Planned</span>
      default:
        return null
    }
  }

  // Get sorted dates (newest first)
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )

  const totalEntriesCount = entries.filter(entry => entry.status !== 'logged').length
  const daysActive = sortedDates.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent mb-2">
            Activity Timeline
          </h1>
          <p className="text-gray-400">Track everything you've watched, played, and read</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Days Active</span>
            </div>
            <p className="text-2xl font-bold text-white">{daysActive}</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Total Entries</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalEntriesCount}</p>
          </div>
        </div>

        {/* Timeline */}
        {sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No activity yet</p>
            <button
              onClick={() => navigate('/add')}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all"
            >
              Add Your First Entry
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map(date => (
              <div key={date} className="relative">
                {/* Date Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-red-400" />
                      {formatDate(date)}
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-1">
                    {groupedEntries[date].length} {groupedEntries[date].length === 1 ? 'entry' : 'entries'}
                  </p>
                </div>

                {/* Entries for this day */}
                <div className="space-y-3">
                  {groupedEntries[date].map(entry => {
                    const Icon = getMediaIcon(entry.media_type)
                    return (
                      <div
                        key={entry.id}
                        className={`bg-gradient-to-r ${getMediaColor(entry.media_type)} border rounded-xl p-4 hover:scale-[1.01] transition-transform`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg bg-gray-800/50 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-white text-lg mb-1 line-clamp-2">
                                  {entry.title}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-gray-400 capitalize">
                                    {entry.media_type}
                                  </span>
                                  {getStatusBadge(entry.status)}
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(entry.created_at)}
                                  </div>
                                </div>
                              </div>

                              {/* Rating */}
                              {entry.rating && (
                                <div className="flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded-lg flex-shrink-0">
                                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                  <span className="text-sm font-semibold text-white">
                                    {entry.rating}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Notes */}
                            {entry.notes && (
                              <p className="text-sm text-gray-300 line-clamp-2 mt-2 bg-gray-900/30 rounded-lg p-2">
                                {entry.notes}
                              </p>
                            )}

                            {/* Additional Info */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              {entry.genre && (
                                <span className="bg-gray-800/50 px-2 py-1 rounded">
                                  {entry.genre}
                                </span>
                              )}
                              {entry.year && (
                                <span className="bg-gray-800/50 px-2 py-1 rounded">
                                  {entry.year}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
