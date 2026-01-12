import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMediaStore, type MediaEntry } from '../store/mediaStore'
import { useNavigate } from 'react-router-dom'
import { Film, Tv, Gamepad2, Book, Star, Calendar, Clock, Activity, ArrowUpRight } from 'lucide-react'

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
    // Group entries by LOCAL date, excluding 'logged' status entries
    const grouped: GroupedEntries = {}
    
    entries
      .filter(entry => entry.status !== 'logged')
      .forEach(entry => {
        // Fix #1: Use local time instead of UTC to fix "tomorrow" bug
        const dateObj = new Date(entry.created_at)
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        const localDateKey = `${year}-${month}-${day}` // "YYYY-MM-DD" in local time

        if (!grouped[localDateKey]) {
          grouped[localDateKey] = []
        }
        grouped[localDateKey].push(entry)
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

  // Refined colors for cleaner UI
  const getMediaStyle = (type: string) => {
    switch (type) {
      case 'movie': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', iconBg: 'bg-red-500/20' }
      case 'show': return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', iconBg: 'bg-purple-500/20' }
      case 'game': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', iconBg: 'bg-blue-500/20' }
      case 'book': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/20' }
      default: return { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700', iconBg: 'bg-gray-700' }
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

  const getRelativeDateLabel = (dateKey: string) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Build local YYYY-MM-DD strings for comparison
    const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    
    if (dateKey === toYMD(today)) return 'Today'
    if (dateKey === toYMD(yesterday)) return 'Yesterday'
    
    const date = new Date(dateKey + 'T00:00:00') // Force local time parsing
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Sort dates descending (newest dates first)
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a))

  const totalEntriesCount = entries.filter(entry => entry.status !== 'logged').length
  const daysActive = sortedDates.length

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24 md:pb-12">
      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/40 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-t from-red-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent inline-flex items-center gap-3">
              <Activity className="w-8 h-8 text-red-500" />
              Timeline
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Your entertainment journey, day by day.</p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-2 text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</div>
              <div className="text-xl font-bold text-white">{totalEntriesCount}</div>
            </div>
            <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-xl px-4 py-2 text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Days</div>
              <div className="text-xl font-bold text-white">{daysActive}</div>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        {sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-800/30 border border-gray-800 rounded-3xl">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <Calendar className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No activity yet</h3>
            <p className="text-gray-400 mb-8 max-w-xs text-center">Start logging movies, games, or books to see your timeline build up.</p>
            <button
              onClick={() => navigate('/add')}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold px-8 py-3 rounded-full hover:shadow-lg hover:shadow-red-500/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <ArrowUpRight className="w-5 h-5" />
              Log Activity
            </button>
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-800 ml-4 md:ml-8 space-y-12">
            {sortedDates.map(date => (
              <div key={date} className="relative pl-8 md:pl-10">
                {/* Date Marker */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-900 border-2 border-pink-500 ring-4 ring-gray-900"></div>
                
                {/* Date Header */}
                <div className="flex items-baseline gap-3 mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {getRelativeDateLabel(date)}
                  </h2>
                  <span className="text-sm text-gray-500 font-medium">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Cards for this day */}
                <div className="space-y-4">
                  {groupedEntries[date].map(entry => {
                    const Icon = getMediaIcon(entry.media_type)
                    const style = getMediaStyle(entry.media_type)
                    
                    return (
                      <div
                        key={entry.id}
                        className={`group relative bg-gray-800/40 hover:bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 rounded-2xl p-4 transition-all duration-200 hover:translate-x-1`}
                      >
                        <div className="flex gap-4">
                          {/* Left: Image or Icon */}
                          <div className="flex-shrink-0">
                            {entry.cover_image_url ? (
                              <div className="w-16 h-24 rounded-lg overflow-hidden shadow-md bg-gray-900">
                                <img src={entry.cover_image_url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className={`w-16 h-24 rounded-lg ${style.bg} flex items-center justify-center border ${style.border}`}>
                                <Icon className={`w-8 h-8 ${style.text}`} />
                              </div>
                            )}
                          </div>

                          {/* Right: Content - Added min-w-0 to fix overflow */}
                          <div className="flex-1 min-w-0 py-1 flex flex-col h-full">
                            
                            {/* Top Row: Title & Time */}
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-white leading-tight truncate pr-1" title={entry.title}>
                                  {entry.title}
                                </h3>
                                
                                {/* Tags Row */}
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text} border ${style.border}`}>
                                    {entry.media_type}
                                  </span>
                                  
                                  {/* Status Dot */}
                                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      entry.status === 'completed' ? 'bg-green-500' :
                                      entry.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-500'
                                    }`}></span>
                                    <span className="capitalize truncate">{entry.status.replace('-', ' ')}</span>
                                  </span>
                                </div>
                              </div>
                              
                              {/* Time Badge - Fixed width to prevent squashing */}
                              <div className="flex-shrink-0 text-xs font-mono text-gray-500 bg-gray-900/50 px-2 py-1 rounded-md border border-gray-700/30">
                                {formatTime(entry.created_at)}
                              </div>
                            </div>

                            {/* Bottom Row: Rating & Notes */}
                            <div className="mt-auto pt-3 flex items-end justify-between gap-4">
                              {entry.rating ? (
                                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                  <span className="text-sm font-bold text-yellow-100">{entry.rating}</span>
                                </div>
                              ) : (
                                <div /> /* Spacer */
                              )}

                              {entry.notes && (
                                <div className="flex-1 min-w-0 text-right">
                                  <p className="text-sm text-gray-400 italic truncate pl-4 border-l-2 border-gray-700/50">
                                    "{entry.notes}"
                                  </p>
                                </div>
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