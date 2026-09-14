import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../store/authStore'
import { useActivity } from '../hooks/queries/useActivityQueries'
import type { MediaEntry } from '../hooks/queries/useMediaQueries'
import { useNavigate } from 'react-router-dom'
import { Film, Tv, Gamepad2, Book, ArrowUpRight } from 'lucide-react'
import PalMark from '../components/brand/PalMark'
import VerdictMark from '../features/verdict/VerdictMark'
import { verdictFor } from '../features/verdict/verdictModel'
import { statusLabel } from '../features/library/libraryModel'

interface GroupedEntries {
  [date: string]: MediaEntry[]
}

const MEDIA_LABELS: Record<MediaEntry['media_type'], string> = {
  movie: 'Movie',
  show: 'Show',
  game: 'Game',
  book: 'Book',
}

export default function ActivityPage() {
  const { user } = useAuthStore(useShallow(s => ({ user: s.user })))
  const { data: entries = [] } = useActivity(user?.id ?? '')
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
  }, [user, navigate])

  const groupedEntries = useMemo(() => {
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

    return grouped
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
    <div className="app-page">
      <main className="relative z-10 max-w-3xl mx-auto px-5 pt-8 pb-8">
        <header className="mb-8">
          <h1 className="app-title">The story so far<span className="text-accent-soft">.</span></h1>
          {totalEntriesCount > 0 && (
            <p className="mt-2 text-sm text-muted">
              {totalEntriesCount} {totalEntriesCount === 1 ? 'title' : 'titles'} across {daysActive} {daysActive === 1 ? 'day' : 'days'}
            </p>
          )}
        </header>

        {/* Timeline Content */}
        {sortedDates.length === 0 ? (
          <div className="app-empty">
            <div className="mx-auto mb-4 flex justify-center">
              <PalMark size={64} />
            </div>
            <h3>No activity yet</h3>
            <p>Start logging movies, games, or books to see your timeline build up.</p>
            <button
              type="button"
              onClick={() => navigate('/add')}
              className="app-button-primary mt-5"
            >
              <ArrowUpRight size={18} />
              Log Activity
            </button>
          </div>
        ) : (
          <div className="relative border-l border-line ml-2 md:ml-4 space-y-10">
            {sortedDates.map(date => (
              <div key={date} className="relative pl-7 md:pl-9">
                {/* Date Marker */}
                <div className="absolute -left-[8.5px] top-1 w-4 h-4 rounded-full bg-bg border-2 border-butter-400 ring-4 ring-bg"></div>

                {/* Date Header */}
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="app-h2">
                    {getRelativeDateLabel(date)}
                  </h2>
                  <span className="text-sm text-muted">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Cards for this day */}
                <div className="space-y-3">
                  {groupedEntries[date].map(entry => {
                    const Icon = getMediaIcon(entry.media_type)
                    const verdict = verdictFor(entry.rating, Boolean(entry.dumpstered))

                    return (
                      <div
                        key={entry.id}
                        className="app-panel rounded-2xl p-3 sm:p-4 flex gap-4"
                      >
                        {/* Left: Image or Icon */}
                        <div className="flex-shrink-0">
                          {entry.cover_image_url ? (
                            <div className="w-16 h-24 rounded-lg overflow-hidden bg-surface-strong">
                              <img loading="lazy" decoding="async" src={entry.cover_image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-24 rounded-lg bg-surface-strong text-muted flex items-center justify-center">
                              <Icon size={28} />
                            </div>
                          )}
                        </div>

                        {/* Right: Content - min-w-0 keeps long titles from overflowing */}
                        <div className="flex-1 min-w-0 py-0.5 flex flex-col">

                          {/* Top Row: Title & Time */}
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-semibold text-gray-50 leading-tight truncate" title={entry.title}>
                                {entry.title}
                              </h3>
                              <p className="text-xs text-muted mt-1">
                                {MEDIA_LABELS[entry.media_type] ?? entry.media_type} · {statusLabel(entry.status)}
                              </p>
                            </div>

                            <span className="flex-shrink-0 text-xs text-muted tabular-nums">
                              {formatTime(entry.created_at)}
                            </span>
                          </div>

                          {/* Bottom Row: Rating & Notes */}
                          <div className="mt-auto pt-3 flex items-end justify-between gap-4">
                            {verdict ? (
                              <div className="flex items-center gap-1.5">
                                <VerdictMark verdict={verdict.id} size={20} />
                                {entry.rating !== null && !entry.dumpstered && (
                                  <span className="text-sm font-semibold text-butter-gold tabular-nums">{entry.rating}</span>
                                )}
                              </div>
                            ) : (
                              <div /> /* Spacer */
                            )}

                            {entry.notes && (
                              <p className="flex-1 min-w-0 text-right text-sm text-muted italic line-clamp-1">
                                {entry.notes}
                              </p>
                            )}
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
