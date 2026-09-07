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
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const collection = useMemo(() => collectLibraryEntries(entries), [entries])
  const counts = useMemo(() => countLibraryEntries(collection), [collection])
  const libraryEntries = useMemo(
    () =>
      selectLibraryEntries(collection, {
        type: filterType,
        search: searchQuery,
        sort,
      }),
    [collection, filterType, searchQuery, sort]
  )
  const hasFilters = filterType !== null || searchQuery.trim().length > 0
  const selectedTypeLabel = mediaTypes.find(
    (type) => type.type === filterType
  )?.label

  function clearFilters() {
    setSearchQuery('')
    setFilterType(null)
  }

  return (
    <div className="app-page min-h-screen bg-[#17120d] text-[#f4f0e8]">
      <main className="mx-auto max-w-6xl px-5 pb-10 pt-7 sm:px-8 sm:pt-10">
        <header className="mb-7 flex items-start justify-between gap-4 sm:mb-9">
          <div>
            <p className="app-kicker mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f2cc8f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f2cc8f]" />
              Made of your favorites
            </p>
            <h1 className="app-title text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl">
              Your collection<span className="text-[#ff655b]">.</span>
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#b3a58c]">
              The worlds you’ve visited. The stories that stayed.
            </p>
          </div>
          <Link
            to="/add"
            aria-label="Add to your library"
            className="mt-7 flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#ff655b] text-[#181311] transition-colors hover:bg-[#ff827a] sm:w-auto sm:rounded-xl sm:px-4"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden text-sm font-semibold sm:inline">
              Add entry
            </span>
          </Link>
        </header>

        <div className="mb-5 flex h-14 items-center rounded-2xl border border-[#443925] bg-[#211a11] px-4 transition-colors focus-within:border-[#ff655b]/70 focus-within:ring-1 focus-within:ring-[#ff655b]/30">
          <Search
            className="h-5 w-5 shrink-0 text-[#b3a58c]"
            aria-hidden="true"
          />
          <input
            aria-label="Search your library"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Find something in your collection"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-[#f4f0e8] placeholder:text-[#908d87] focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear library search"
              onClick={() => setSearchQuery('')}
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#b3a58c] hover:bg-[#26282c]"
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
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${filterType === null ? 'border-[#f4f0e8] bg-[#f4f0e8] text-[#211a11]' : 'border-[#443925] bg-[#211a11] text-[#b3a58c] hover:text-[#f4f0e8]'}`}
          >
            All
            <span
              className={`text-xs tabular-nums ${filterType === null ? 'text-[#5e5c58]' : 'text-[#b3a58c]'}`}
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
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${filterType === type ? 'border-[#f4f0e8] bg-[#f4f0e8] text-[#211a11]' : 'border-[#443925] bg-[#211a11] text-[#b3a58c] hover:text-[#f4f0e8]'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
              <span
                className={`text-xs tabular-nums ${filterType === type ? 'text-[#5e5c58]' : 'text-[#b3a58c]'}`}
              >
                {counts[type]}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-2 gap-y-3 border-t border-[#3a2f1f] pt-5">
          <div aria-live="polite">
            <h2 className="text-lg font-semibold tracking-tight">
              {searchQuery.trim()
                ? 'Search results'
                : selectedTypeLabel || 'On your shelf'}
            </h2>
            <p className="mt-0.5 text-xs text-[#b3a58c]">
              {isPending
                ? 'Finding your stories…'
                : `${libraryEntries.length} ${libraryEntries.length === 1 ? 'title' : 'titles'}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <label className="relative flex min-h-11 items-center gap-1.5 text-xs text-[#c6c2bb]">
              <ArrowUpDown
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span className="sr-only">Sort collection</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as LibrarySort)}
                className="min-h-11 max-w-[110px] cursor-pointer appearance-none rounded-lg border-0 bg-transparent pr-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff655b]"
              >
                <option value="recent">Recently updated</option>
                <option value="title">Title A–Z</option>
                <option value="rating">Highest rated</option>
              </select>
            </label>
            <div
              className="flex rounded-xl border border-[#443925] bg-[#211a11] p-0.5"
              role="group"
              aria-label="Collection view"
            >
              <button
                type="button"
                aria-label="Poster grid view"
                aria-pressed={view === 'grid'}
                onClick={() => setView('grid')}
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${view === 'grid' ? 'bg-[#443925] text-[#f4f0e8]' : 'text-[#b3a58c]'}`}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
                className={`flex h-11 w-11 items-center justify-center rounded-lg ${view === 'list' ? 'bg-[#443925] text-[#f4f0e8]' : 'text-[#b3a58c]'}`}
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
                <div className="aspect-[2/3] rounded-2xl bg-[#2a2216]" />
                <div className="mt-3 h-4 w-4/5 rounded bg-[#2a2216]" />
                <div className="mt-2 h-3 w-2/5 rounded bg-[#2a2216]" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="rounded-3xl border border-[#443925] bg-[#211a11] px-6 py-12 text-center"
          >
            <h3 className="text-xl font-semibold">
              Your shelf is taking a moment
            </h3>
            <p className="mx-auto mb-6 mt-2 max-w-xs text-sm leading-relaxed text-[#b3a58c]">
              We couldn’t load your collection. Try again to pick up where you
              left off.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-12 rounded-xl bg-[#ff655b] px-6 text-sm font-semibold text-[#181311]"
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
          <div className="rounded-3xl border border-[#3a2f1f] bg-[#211a11] px-6 py-14 text-center sm:py-20">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f2cc8f]/20 bg-[#f2cc8f]/5 text-[#f2cc8f]">
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
            <p className="mx-auto mb-7 mt-3 max-w-xs text-sm leading-relaxed text-[#b3a58c]">
              {hasFilters
                ? 'Try another title or explore the rest of your collection.'
                : 'A film you can’t stop thinking about. A book you stayed up for. Make this space yours.'}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-12 rounded-xl border border-[#45474b] px-6 text-sm font-semibold text-[#f4f0e8]"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/add"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#ff655b] px-6 text-sm font-semibold text-[#181311]"
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
