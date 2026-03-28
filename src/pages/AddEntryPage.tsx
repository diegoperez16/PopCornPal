import React, { useEffect, useState } from 'react'
import { Film, Tv, Gamepad2, Book, Search, Loader2, X, Minus, Plus, ChevronDown } from 'lucide-react'
import SharedDecimalRating from '../components/DecimalRating'
import {
  useAddEntryPage,
  type SearchResult,
  type MediaType,
  type Season,
  type Episode,
} from '../hooks/useAddEntryPage'

// ─── Decimal rating stepper (0 = no rating, 0.1–10.0) ────────────────────────
function DecimalRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const step = (delta: number) => {
    const next = Math.round((value + delta) * 10) / 10
    onChange(Math.min(10, Math.max(0, next)))
  }

  const commitDraft = () => {
    const n = parseFloat(draft)
    if (!isNaN(n)) onChange(Math.min(10, Math.max(0, Math.round(n * 10) / 10)))
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => step(-0.1)}
        className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors active:scale-95 flex-shrink-0"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
          className="w-16 text-center bg-transparent text-2xl font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          autoFocus
        />
      ) : (
        <button
          onClick={() => { setDraft(value > 0 ? String(value) : ''); setEditing(true) }}
          className="w-16 text-center text-2xl font-bold text-white tabular-nums"
        >
          {value > 0 ? value.toFixed(1) : <span className="text-gray-600">—</span>}
        </button>
      )}

      <button
        onClick={() => step(0.1)}
        className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors active:scale-95 flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {value > 0 && (
        <button
          onClick={() => onChange(0)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors ml-1"
        >
          Clear
        </button>
      )}
    </div>
  )
}

// ─── Compact inline episode rating ───────────────────────────────────────────
function EpisodeRatingInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const n = parseFloat(draft)
    if (!isNaN(n)) onChange(Math.min(10, Math.max(0, Math.round(n * 10) / 10)))
    setEditing(false)
  }

  const step = (delta: number) => {
    const next = Math.round((value + delta) * 10) / 10
    onChange(Math.min(10, Math.max(0, next)))
  }

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        onClick={() => step(-0.5)}
        className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors active:scale-90"
      >
        <Minus className="w-2.5 h-2.5" />
      </button>
      {editing ? (
        <input
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-10 text-center bg-transparent text-sm font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          autoFocus
        />
      ) : (
        <button
          onClick={() => { setDraft(value > 0 ? String(value) : ''); setEditing(true) }}
          className="w-10 text-center text-sm font-semibold tabular-nums"
        >
          {value > 0
            ? <span className="text-white">{value.toFixed(1)}</span>
            : <span className="text-gray-600">—</span>
          }
        </button>
      )}
      <button
        onClick={() => step(0.5)}
        className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors active:scale-90"
      >
        <Plus className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}

// ─── Episode row ─────────────────────────────────────────────────────────────
function EpisodeRow({
  episode,
  rating,
  onRate,
}: {
  episode: Episode
  rating: number
  onRate: (r: number) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      {episode.still_path ? (
        <img
          src={episode.still_path}
          alt={episode.name}
          loading="lazy"
          className="w-16 h-9 rounded object-cover flex-shrink-0 bg-gray-800"
        />
      ) : (
        <div className="w-16 h-9 rounded bg-gray-800/60 flex-shrink-0 flex items-center justify-center">
          <Tv className="w-4 h-4 text-gray-700" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-600 font-medium">Ep {episode.episode_number}</p>
        <p className="text-xs font-semibold text-gray-300 truncate leading-tight">{episode.name}</p>
      </div>
      <EpisodeRatingInput value={rating} onChange={onRate} />
    </div>
  )
}

// ─── Season tabs ──────────────────────────────────────────────────────────────
function SeasonTabs({
  seasons,
  selected,
  onSelect,
}: {
  seasons: Season[]
  selected: number
  onSelect: (n: number) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {seasons.map((s) => (
        <button
          key={s.season_number}
          onClick={() => onSelect(s.season_number)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            selected === s.season_number
              ? 'bg-white text-gray-900'
              : 'bg-gray-800 text-gray-500 hover:text-gray-300'
          }`}
        >
          S{s.season_number}
        </button>
      ))}
    </div>
  )
}

// ─── Poster card ──────────────────────────────────────────────────────────────
function PosterCard({
  item,
  onSelect,
}: {
  item: SearchResult
  onSelect: (i: SearchResult) => void
}) {
  const Icon =
    item.type === 'show' ? Tv : item.type === 'game' ? Gamepad2 : item.type === 'book' ? Book : Film

  return (
    <div onClick={() => onSelect(item)} className="group cursor-pointer">
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800/60 relative ring-1 ring-white/5 group-hover:ring-white/15 transition-all duration-200 group-hover:-translate-y-0.5">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-7 h-7 text-gray-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
      </div>
      <p className="text-[11px] font-semibold text-gray-400 mt-1.5 truncate group-hover:text-gray-200 transition-colors leading-tight">
        {item.title}
      </p>
      {item.year && (
        <p className="text-[10px] text-gray-700">{item.year}</p>
      )}
    </div>
  )
}

// ─── Log panel ────────────────────────────────────────────────────────────────
function LogPanel({
  item,
  hook,
  onClose,
}: {
  item: SearchResult
  hook: ReturnType<typeof useAddEntryPage>
  onClose: () => void
}) {
  const {
    rating, setRating,
    status, setStatus,
    notes, setNotes,
    watchedDate, setWatchedDate,
    episodeMode, enterEpisodeMode, exitEpisodeMode,
    seasons, selectedSeason, setSelectedSeason,
    episodes, pendingRatings,
    loadingSeasons, loadingEpisodes,
    saving, duplicateError, saveError,
    setPendingEpisodeRating,
    getPendingEpisodeRating,
    handleSave,
  } = hook

  const isShow = item.type === 'show'
  const pendingCount = pendingRatings.length

  const statusOptions = [
    { value: 'completed', label: 'Watched' },
    { value: 'in-progress', label: 'Watching' },
    { value: 'planned', label: 'Want to Watch' },
    { value: 'logged', label: 'Logged' },
  ] as const

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Drag handle (mobile) */}
      <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0 md:hidden">
        <div className="w-8 h-1 rounded-full bg-gray-700" />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-white/6 flex-shrink-0">
        {item.image && (
          <img
            src={item.image}
            alt={item.title}
            className="w-10 h-14 rounded object-cover flex-shrink-0 shadow"
          />
        )}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-0.5">
            {item.type === 'show' ? 'TV Show' : item.type === 'game' ? 'Game' : item.type === 'book' ? 'Book' : 'Film'}
            {item.year && ` · ${item.year}`}
          </p>
          <h2 className="text-base font-bold text-white leading-tight line-clamp-2">{item.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 mt-0.5 rounded-full text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Episode toggle (shows only) */}
      {isShow && (
        <div className="px-4 pt-3 flex gap-2 flex-shrink-0">
          <button
            onClick={exitEpisodeMode}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              !episodeMode ? 'bg-white text-gray-900' : 'bg-gray-800/70 text-gray-500 hover:text-gray-300'
            }`}
          >
            Overall
          </button>
          <button
            onClick={enterEpisodeMode}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all relative ${
              episodeMode ? 'bg-white text-gray-900' : 'bg-gray-800/70 text-gray-500 hover:text-gray-300'
            }`}
          >
            Episodes
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        {isShow && episodeMode ? (
          /* Episode rating panel */
          <div className="px-4 pt-3 pb-4">
            {loadingSeasons ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              </div>
            ) : (
              <>
                <SeasonTabs seasons={seasons} selected={selectedSeason} onSelect={setSelectedSeason} />
                <div className="mt-3">
                  {loadingEpisodes ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    </div>
                  ) : episodes.length > 0 ? (
                    episodes.map((ep) => (
                      <EpisodeRow
                        key={ep.episode_number}
                        episode={ep}
                        rating={getPendingEpisodeRating(selectedSeason, ep.episode_number)}
                        onRate={(r) => setPendingEpisodeRating(selectedSeason, ep.episode_number, ep.name, r)}
                      />
                    ))
                  ) : (
                    <p className="text-center text-gray-600 text-sm py-8">No episodes found</p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Overall form */
          <div className="px-4 pt-3 pb-4 space-y-4">
            {/* Status */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Status</p>
              <div className="grid grid-cols-2 gap-1.5">
                {statusOptions.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all text-center ${
                      status === s.value
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-800/60 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            {(status === 'completed' || status === 'logged') && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
                  Rating <span className="normal-case font-normal text-gray-700">/ 10</span>
                </p>
                <SharedDecimalRating value={rating} onChange={setRating} />
              </div>
            )}

            {/* Date watched */}
            {status === 'completed' && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Date Watched</p>
                <div className="relative">
                  <input
                    type="date"
                    value={watchedDate}
                    onChange={(e) => setWatchedDate(e.target.value)}
                    className="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/15 [color-scheme:dark]"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Review */}
            {(status === 'completed' || status === 'logged') && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Review</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add a review…"
                  className="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-white/15 resize-none leading-relaxed"
                />
              </div>
            )}

            {duplicateError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                Already in your library with this status.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="px-4 py-3 border-t border-white/6 flex-shrink-0 space-y-2">
        {saveError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || (isShow && episodeMode && pendingCount === 0)}
          className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isShow && episodeMode ? (
            `Save ${pendingCount} Episode${pendingCount !== 1 ? 's' : ''}`
          ) : (
            'Add to Library'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AddEntryPage() {
  const hook = useAddEntryPage()
  const {
    activeTab, setActiveTab,
    query, setQuery,
    results,
    selectedItem, selectItem, handleClose,
    searching,
  } = hook

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedItem])

  const tabs: { id: MediaType; label: string; Icon: typeof Film }[] = [
    { id: 'movie', label: 'Films', Icon: Film },
    { id: 'show', label: 'TV', Icon: Tv },
    { id: 'game', label: 'Games', Icon: Gamepad2 },
    { id: 'book', label: 'Books', Icon: Book },
  ]

  const activeIcon = tabs.find((t) => t.id === activeTab)!.Icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-xl mx-auto px-4 pt-5 pb-28">

        {/* Tab selector */}
        <div className="flex gap-1 mb-4 p-1 bg-gray-900/60 rounded-xl">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold flex-1 transition-all ${
                activeTab === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {searching
              ? <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
              : <Search className="w-4 h-4 text-gray-600" />
            }
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tabs.find((t) => t.id === activeTab)?.label.toLowerCase()}…`}
            autoFocus
            className="w-full bg-gray-900/70 border border-gray-800 rounded-xl pl-10 pr-9 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-gray-700 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-600 hover:text-gray-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Skeleton */}
        {searching && results.length === 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] rounded-lg bg-gray-800/60" />
                <div className="h-2 bg-gray-800/40 rounded mt-1.5 mx-1" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {results.map((item) => (
              <PosterCard key={item.id} item={item} onSelect={selectItem} />
            ))}
          </div>
        )}

        {/* Empty states */}
        {results.length === 0 && query && !searching && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm font-semibold">No results for "{query}"</p>
            <p className="text-gray-700 text-xs mt-1">Try different keywords</p>
          </div>
        )}

        {results.length === 0 && !query && !searching && (
          <div className="text-center py-16">
            {React.createElement(activeIcon, { className: 'w-8 h-8 text-gray-800 mx-auto mb-3' })}
            <p className="text-gray-600 text-sm">
              Search for {tabs.find((t) => t.id === activeTab)?.label.toLowerCase()} to log
            </p>
          </div>
        )}
      </div>

      {/* Sheet overlay */}
      {selectedItem && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            onClick={handleClose}
          />
          <div className="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-6">
            <div className="w-full md:w-[400px] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col rounded-t-2xl max-h-[88dvh] md:max-h-[80vh] bg-gray-900">
              <LogPanel item={selectedItem} hook={hook} onClose={handleClose} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

