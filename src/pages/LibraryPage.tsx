import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  Film,
  Gamepad2,
  Grid2X2,
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
import PalMark from '../components/brand/PalMark'
import {
  collectLibraryEntries,
  collectLibraryYears,
  countLibraryEntries,
  parseYearFilter,
  selectLibraryEntries,
} from '../features/library/libraryModel'
import type {
  LibrarySort,
  MediaType,
  YearFilter,
} from '../features/library/libraryModel'

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
  // Two different questions a year can answer: when it reached your shelf,
  // and when the thing itself came out.
  const [yearFilter, setYearFilter] = useState<YearFilter>('any')
  const { addedYear, releaseYear } = useMemo(
    () => parseYearFilter(yearFilter),
    [yearFilter]
  )
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const collection = useMemo(() => collectLibraryEntries(entries), [entries])
  const counts = useMemo(() => countLibraryEntries(collection), [collection])
  const years = useMemo(() => collectLibraryYears(collection), [collection])
  const libraryEntries = useMemo(
    () =>
      selectLibraryEntries(collection, {
        type: filterType,
        search: searchQuery,
        sort,
        minRating,
        maxRating,
        addedYear,
        releaseYear,
      }),
    [
      collection,
      filterType,
      searchQuery,
      sort,
      minRating,
      maxRating,
      addedYear,
      releaseYear,
    ]
  )
  const hasFilters =
    filterType !== null ||
    searchQuery.trim().length > 0 ||
    ratingBand !== 'any' ||
    yearFilter !== 'any'
  const selectedTypeLabel = mediaTypes.find(
    (type) => type.type === filterType
  )?.label

  function clearFilters() {
    setSearchQuery('')
    setFilterType(null)
    setRatingBand('any')
    setYearFilter('any')
  }

  return (
    <div className="app-page">
      <main className="mx-auto max-w-6xl px-5 pb-10 pt-7 sm:px-8 sm:pt-10">
        <header className="mb-5 flex items-center justify-between gap-4 sm:mb-8">
          <h1 className="app-title">
            Your collection<span className="text-accent">.</span>
          </h1>
          <Link
            to="/add"
            aria-label="Add to your library"
            className="app-button-primary app-button-sm !rounded-full !px-0 w-12 sm:w-auto sm:!px-4"
          >
            <Plus size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Log a title</span>
          </Link>
        </header>

        <div className="app-search mb-4">
          <Search size={20} aria-hidden="true" />
          <input
            aria-label="Search your library"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Find something in your collection"
            enterKeyHint="search"
            className="app-input !min-h-14 !pr-12"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear library search"
              onClick={() => setSearchQuery('')}
              className="app-icon-button absolute right-1 top-1/2 -translate-y-1/2"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div
          className="no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0"
          role="group"
          aria-label="Filter collection by media type"
        >
          <button
            type="button"
            aria-pressed={filterType === null}
            onClick={() => setFilterType(null)}
            className="app-chip"
          >
            All
            <span className="app-chip-count">{collection.length}</span>
          </button>
          {mediaTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              aria-pressed={filterType === type}
              onClick={() => setFilterType(filterType === type ? null : type)}
              className="app-chip"
            >
              <Icon size={16} aria-hidden="true" />
              {label}
              <span className="app-chip-count">{counts[type]}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-end justify-between gap-3 border-t border-line pt-5">
          <div aria-live="polite">
            <h2 className="app-h2">
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
          <div
            className="app-segmented shrink-0 !gap-1 !p-1"
            role="group"
            aria-label="Collection view"
          >
            <button
              type="button"
              aria-label="Poster grid view"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
              className="!min-h-10 !w-11 !px-0"
            >
              <Grid2X2 size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className="!min-h-10 !w-11 !px-0"
            >
              <List size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          <span className="app-select">
            <span className="sr-only" id="year-filter-label">
              Filter titles by year
            </span>
            <select
              aria-labelledby="year-filter-label"
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className={`app-chip !pl-9 ${yearFilter !== 'any' ? 'is-on' : ''}`}
            >
              <option value="any">Any year</option>
              <optgroup label="Added in">
                {years.added.map((year) => (
                  <option key={`added-${year}`} value={`added-${year}`}>
                    Added {year}
                  </option>
                ))}
              </optgroup>
              {years.released.length > 0 && (
                <optgroup label="Released in">
                  {years.released.map((year) => (
                    <option key={`released-${year}`} value={`released-${year}`}>
                      From {year}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <CalendarDays
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            />
          </span>
          <span className="app-select">
            <span className="sr-only" id="rating-filter-label">
              Only show titles rated at least
            </span>
            <select
              aria-labelledby="rating-filter-label"
              value={ratingBand}
              onChange={(event) => setRatingBand(event.target.value)}
              className={`app-chip !pl-9 ${ratingBand !== 'any' ? 'is-on' : ''}`}
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
            <Star
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            />
          </span>
          <span className="app-select">
            <span className="sr-only" id="sort-label">
              Sort collection
            </span>
            <select
              aria-labelledby="sort-label"
              value={sort}
              onChange={(event) => setSort(event.target.value as LibrarySort)}
              className="app-chip !pl-9"
            >
              <option value="recent">Recently updated</option>
              <option value="title">Title A–Z</option>
              <option value="rating">Highest rated</option>
            </select>
            <ArrowUpDown
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
            />
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="app-button-ghost app-button-sm shrink-0"
            >
              Clear
            </button>
          )}
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
          <div role="alert" className="app-empty">
            <PalMark size={56} />
            <h3 className="mt-3">Your shelf is taking a moment</h3>
            <p>
              We couldn’t load your collection. Try again to pick up where you
              left off.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="app-button-primary mt-6"
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
          <div className="app-empty sm:py-20">
            <PalMark size={64} />
            <h3 className="mt-3">
              {hasFilters
                ? 'No stories on this shelf. Yet.'
                : 'Every collection starts somewhere.'}
            </h3>
            <p>
              {hasFilters
                ? 'Try another title or explore the rest of your collection.'
                : 'A film you can’t stop thinking about. A book you stayed up for. Make this space yours.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="app-button-secondary mt-6"
              >
                Clear filters
              </button>
            ) : (
              <Link to="/add" className="app-button-primary mt-6">
                <Plus size={18} aria-hidden="true" />
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
