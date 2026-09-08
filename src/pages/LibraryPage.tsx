import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpDown,
  BookOpen,
  Film,
  Gamepad2,
  Grid2X2,
  Library,
  List,
  Plus,
  Search,
  Star,
  Tv,
  X,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useMediaEntries } from '../hooks/queries/useMediaQueries'
import type { MediaEntry } from '../hooks/queries/useMediaQueries'
import LibraryEntryCard from '../features/library/LibraryEntryCard'
import EntryEditor from '../features/library/EntryEditor'
import {
  collectLibraryEntries,
  countLibraryEntries,
  selectLibraryEntries,
} from '../features/library/libraryModel'
import type { LibrarySort, MediaType } from '../features/library/libraryModel'

const mediaTypes = [
  { type: 'movie', label: 'Movies', icon: Film },
  { type: 'show', label: 'Series', icon: Tv },
  { type: 'game', label: 'Games', icon: Gamepad2 },
  { type: 'book', label: 'Books', icon: BookOpen },
] as const
const emptyEntries: MediaEntry[] = []

export default function LibraryPage() {
  const user = useAuthStore((state) => state.user)
  const {
    data: entries = emptyEntries,
    isPending,
    isError,
    refetch,
  } = useMediaEntries(user?.id ?? '')
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null)
  const [filterType, setFilterType] = useState<MediaType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<LibrarySort>('recent')
  // A band rather than a floor, so "the 9s" is as easy to ask for as "9 and up".
  const [ratingBand, setRatingBand] = useState('any')
  const [minRating, maxRating] = useMemo(() => {
    if (ratingBand === 'any') return [0, 10]
    if (ratingBand.startsWith('min-')) return [Number(ratingBand.slice(4)), 10]
    const only = Number(ratingBand.slice(5))
    // "the 9s" means 9 up to but not including 10; 10 stands alone.
    return only === 10 ? [10, 10] : [only, only + 0.9]
  }, [ratingBand])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const collection = useMemo(() => collectLibraryEntries(entries), [entries])
  const counts = useMemo(() => countLibraryEntries(collection), [collection])
  const libraryEntries = useMemo(
    () =>
      selectLibraryEntries(collection, {
        type: filterType,
        search: searchQuery,
        sort,
        minRating,
        maxRating,
      }),
    [collection, filterType, searchQuery, sort, minRating, maxRating]
  )
  const hasFilters =
    filterType !== null || searchQuery.trim().length > 0 || ratingBand !== 'any'
  const selectedTypeLabel = mediaTypes.find(
    (type) => type.type === filterType
  )?.label

  function clearFilters() {
    setSearchQuery('')
    setFilterType(null)
    setRatingBand('any')
  }

  return (
    <div className="app-page min-h-screen bg-gray-900 text-parchment">
      <main className="mx-auto max-w-6xl px-5 pb-10 pt-7 sm:px-8 sm:pt-10">
        <header className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <h1 className="app-title">
            Your collection<span className="text-accent">.</span>
          </h1>
          <Link
            to="/add"
            aria-label="Add to your library"
            className="flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent text-accent-on transition-colors hover:bg-accent-warm sm:w-auto sm:rounded-xl sm:px-4"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden text-sm font-semibold sm:inline">
              Add entry
            </span>
          </Link>
        </header>

        <div className="mb-5 flex h-14 items-center rounded-2xl border border-line-soft bg-gray-800 px-4 transition-colors focus-within:border-accent/70 focus-within:ring-1 focus-within:ring-accent/30">
          <Search
            className="h-5 w-5 shrink-0 text-muted"
            aria-hidden="true"
          />
          <input
            aria-label="Search your library"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Find something in your collection"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-parchment placeholder:text-[#908d87] focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear library search"
              onClick={() => setSearchQuery('')}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-[#26282c]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          className="-mx-5 mb-7 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
          role="group"
          aria-label="Filter collection by media type"
        >
          <button
            type="button"
            aria-pressed={filterType === null}
            onClick={() => setFilterType(null)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${filterType === null ? 'border-parchment bg-parchment text-gray-800' : 'border-line-soft bg-gray-800 text-muted hover:text-parchment'}`}
          >
            All
            <span
              className={`text-xs tabular-nums ${filterType === null ? 'text-[#5e5c58]' : 'text-muted'}`}
            >
              {collection.length}
            </span>
          </button>
          {mediaTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              aria-pressed={filterType === type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${filterType === type ? 'border-parchment bg-parchment text-gray-800' : 'border-line-soft bg-gray-800 text-muted hover:text-parchment'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              <span
                className={`text-xs tabular-nums ${filterType === type ? 'text-[#5e5c58]' : 'text-muted'}`}
              >
                {counts[type]}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-2 gap-y-3 border-t border-gray-700 pt-5">
          <div aria-live="polite">
            <h2 className="text-lg font-semibold tracking-tight">
              {searchQuery.trim()
                ? 'Search results'
                : selectedTypeLabel || 'On your shelf'}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {isPending
                ? 'Finding your stories…'
                : `${libraryEntries.length} ${libraryEntries.length === 1 ? 'title' : 'titles'}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <label className="relative flex min-h-11 items-center gap-1.5 text-xs text-[#c6c2bb]">
              <Star className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">Only show titles rated at least</span>
              <select
                value={ratingBand}
                onChange={(event) => setRatingBand(event.target.value)}
                className="min-h-11 cursor-pointer appearance-none rounded-lg border-0 bg-transparent pr-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="any">Any rating</option>
                <optgroup label="At least">
                  <option value="min-9">9 and up</option>
                  <option value="min-8">8 and up</option>
                  <option value="min-7">7 and up</option>
                  <option value="min-5">5 and up</option>
                </optgroup>
                <optgroup label="Only">
                  <option value="only-10">10s</option>
                  <option value="only-9">9s</option>
                  <option value="only-8">8s</option>
                  <option value="only-7">7s</option>
                  <option value="only-6">6s</option>
                  <option value="only-5">5s</option>
                </optgroup>
              </select>
            </label>
            <label className="relative flex min-h-11 items-center gap-1.5 text-xs text-[#c6c2bb]">
              <ArrowUpDown
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span className="sr-only">Sort collection</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as LibrarySort)}
                className="min-h-11 max-w-[110px] cursor-pointer appearance-none rounded-lg border-0 bg-transparent pr-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="recent">Recently updated</option>
                <option value="title">Title A–Z</option>
                <option value="rating">Highest rated</option>
              </select>
            </label>
            <div
              className="flex rounded-xl border border-line-soft bg-gray-800 p-0.5"
              role="group"
              aria-label="Collection view"
            >
              <button
                type="button"
                aria-label="Poster grid view"
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${view === 'grid' ? 'bg-line-soft text-parchment' : 'text-muted'}`}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${view === 'list' ? 'bg-line-soft text-parchment' : 'text-muted'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {isPending ? (
          <div
            role="status"
            aria-label="Loading your collection"
            className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="motion-safe:animate-pulse"
              >
                <div className="aspect-[2/3] rounded-2xl bg-surface-strong" />
                <div className="mt-3 h-4 w-4/5 rounded bg-surface-strong" />
                <div className="mt-2 h-3 w-2/5 rounded bg-surface-strong" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="rounded-3xl border border-line-soft bg-gray-800 px-6 py-12 text-center"
          >
            <h3 className="text-xl font-semibold">
              Your shelf is taking a moment
            </h3>
            <p className="mx-auto mb-6 mt-2 max-w-xs text-sm leading-relaxed text-muted">
              We couldn’t load your collection. Try again to pick up where you
              left off.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-12 rounded-xl bg-accent px-6 text-sm font-semibold text-accent-on"
            >
              Try again
            </button>
          </div>
        ) : libraryEntries.length ? (
          <div
            className={
              view === 'grid'
                ? 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5'
                : 'grid gap-3 md:grid-cols-2'
            }
          >
            {libraryEntries.map((entry) => (
              <LibraryEntryCard
                key={entry.id}
                entry={entry}
                view={view}
                onSelect={setSelectedEntry}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-700 bg-gray-800 px-6 py-14 text-center sm:py-20">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-butter-gold/20 bg-butter-gold/5 text-butter-gold">
              {hasFilters ? (
                <Search className="h-7 w-7" strokeWidth={1.5} />
              ) : (
                <Library className="h-7 w-7" strokeWidth={1.5} />
              )}
            </div>
            <h3 className="text-2xl font-semibold tracking-tight">
              {hasFilters
                ? 'No stories on this shelf. Yet.'
                : 'Every collection starts somewhere.'}
            </h3>
            <p className="mx-auto mb-7 mt-3 max-w-xs text-sm leading-relaxed text-muted">
              {hasFilters
                ? 'Try another title or explore the rest of your collection.'
                : 'A film you can’t stop thinking about. A book you stayed up for. Make this space yours.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-12 rounded-xl border border-line-strong px-6 text-sm font-semibold text-parchment"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/add"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-accent-on"
              >
                <Plus className="h-4 w-4" />
                Add your first entry
              </Link>
            )}
          </div>
        )}
      </main>
      {selectedEntry && user && (
        <EntryEditor
          key={selectedEntry.id}
          entry={selectedEntry}
          userId={user.id}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  )
}
