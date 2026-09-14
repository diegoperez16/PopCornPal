import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  Clapperboard,
  Film,
  Gamepad2,
  Loader2,
  RotateCcw,
  Search,
  Tv,
  X,
} from 'lucide-react'
import RatingField from '../components/RatingField'
import NoteField from '../components/NoteField'
import Sheet from '../components/Sheet'
import PalMark from '../components/brand/PalMark'
import { useAddEntryPage, type WatchStatus } from '../hooks/useAddEntryPage'
import { localDateString } from '../lib/addEntryDraft'
import { STATUS_LABELS } from '../features/library/libraryModel'

const categories = [
  { type: 'movie', label: 'Movies', Icon: Film },
  { type: 'show', label: 'Shows', Icon: Tv },
  { type: 'game', label: 'Games', Icon: Gamepad2 },
  { type: 'book', label: 'Books', Icon: BookOpen },
] as const
const statuses: { value: WatchStatus; title: string }[] = [
  { value: 'completed', title: STATUS_LABELS.completed },
  { value: 'in-progress', title: STATUS_LABELS['in-progress'] },
  { value: 'planned', title: STATUS_LABELS.planned },
  { value: 'logged', title: STATUS_LABELS.logged },
]
const typeNames = { movie: 'Movie', show: 'Show', game: 'Game', book: 'Book' }

type Workflow = ReturnType<typeof useAddEntryPage>

/**
 * The logging moment: what did you just finish, and what did you think?
 * One sheet, thumb-reach controls, Poppy reacting to the score.
 */
function LogSheet({ workflow: w }: { workflow: Workflow }) {
  const item = w.selectedItem
  if (!item) return null
  const meta = [typeNames[item.type] ?? item.type, item.year]
    .filter(Boolean)
    .join(' · ')

  return (
    <Sheet
      ariaLabel={`Log ${item.title}`}
      onClose={w.handleClose}
      closeLabel="Close log; keep draft"
      closeDisabled={w.saving}
      header={
        <div className="flex items-center gap-4 pt-1">
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className="h-[100px] w-[68px] shrink-0 rounded-xl border border-line-soft bg-surface-strong object-cover"
            />
          ) : (
            <div className="flex h-[100px] w-[68px] shrink-0 items-center justify-center rounded-xl border border-line-soft bg-surface-strong text-muted">
              <Clapperboard size={26} strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="log-title"
              className="text-xl font-semibold leading-tight tracking-tight text-gray-50"
            >
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{meta}</p>
          </div>
        </div>
      }
      footer={
        <button
          className="app-button-primary w-full"
          onClick={() => void w.handleSave()}
          disabled={w.saving || (w.episodeMode && !w.pendingRatings.length)}
        >
          {w.saving ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <Check size={18} aria-hidden="true" />
              {w.episodeMode ? 'Save ratings' : 'Save'}
            </>
          )}
        </button>
      }
    >
      <div className="space-y-5 pt-1">
        {item.type === 'show' && (
          <div className="app-segmented" role="group" aria-label="What to log">
            <button
              type="button"
              aria-pressed={!w.episodeMode}
              onClick={w.exitEpisodeMode}
              disabled={w.saving}
            >
              Whole show
            </button>
            <button
              type="button"
              aria-pressed={w.episodeMode}
              onClick={w.enterEpisodeMode}
              disabled={w.saving}
            >
              By episode
            </button>
          </div>
        )}

        {w.episodeMode ? (
          <>
            <div>
              <label htmlFor="season" className="app-label">
                Season
              </label>
              <span className="app-select w-full">
                <select
                  id="season"
                  value={w.selectedSeason}
                  onChange={(e) => w.setSelectedSeason(Number(e.target.value))}
                  className="app-input"
                  disabled={w.loadingSeasons || w.saving}
                >
                  {w.seasons.map((season) => (
                    <option
                      value={season.season_number}
                      key={season.season_number}
                    >
                      {season.name}
                    </option>
                  ))}
                </select>
              </span>
            </div>
            {w.seasonError && (
              <p role="alert" className="app-note app-note-danger">
                {w.seasonError}{' '}
                <button
                  onClick={w.retrySeasons}
                  className="font-semibold underline underline-offset-4"
                >
                  Retry seasons
                </button>
              </p>
            )}
            {w.episodeError && (
              <p role="alert" className="app-note app-note-danger">
                {w.episodeError}{' '}
                <button
                  onClick={w.retryEpisodes}
                  className="font-semibold underline underline-offset-4"
                >
                  Retry episodes
                </button>
              </p>
            )}
            {(w.loadingSeasons || w.loadingEpisodes) && (
              <p role="status" className="flex items-center gap-2 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Loading episodes…
              </p>
            )}
            <div className="space-y-2">
              {w.episodes.map((episode) => (
                <div
                  key={episode.episode_number}
                  className="flex items-center gap-3 rounded-xl border border-line-soft bg-surface-sunken p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted">
                      Episode {episode.episode_number}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-gray-50">
                      {episode.name}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="sr-only">Rating for {episode.name}</span>
                    <input
                      className="app-input !w-20 !min-h-11 !p-2 text-center tabular-nums"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="10"
                      step="0.5"
                      disabled={w.saving}
                      value={
                        w.getPendingEpisodeRating(
                          w.selectedSeason,
                          episode.episode_number
                        ) || ''
                      }
                      placeholder="—"
                      onChange={(e) =>
                        w.setPendingEpisodeRating(
                          w.selectedSeason,
                          episode.episode_number,
                          episode.name,
                          Number(e.target.value)
                        )
                      }
                    />
                    <span>/10</span>
                  </label>
                </div>
              ))}
            </div>
            {!w.loadingEpisodes &&
              !w.loadingSeasons &&
              !w.seasonError &&
              !w.episodeError &&
              !w.episodes.length && (
                <p className="text-sm text-muted">
                  There are no episodes available for this season yet.
                </p>
              )}
            <p className="text-xs text-muted">
              {w.pendingRatings.length} episode{' '}
              {w.pendingRatings.length === 1 ? 'rating' : 'ratings'} ready.
            </p>
          </>
        ) : (
          <>
            <fieldset disabled={w.saving}>
              <legend className="app-label">How did it go?</legend>
              <div className="grid grid-cols-2 gap-2">
                {statuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => w.setStatus(status.value)}
                    aria-pressed={w.status === status.value}
                    className="app-option"
                  >
                    {status.title}
                  </button>
                ))}
              </div>
            </fieldset>
            {(w.status === 'completed' || w.status === 'logged') && (
              <RatingField
                rating={w.rating}
                onChange={w.setRating}
                dumpstered={w.dumpstered}
                onToggleDumpster={w.toggleDumpster}
                disabled={w.saving}
              />
            )}
            {w.status === 'completed' && (
              <div>
                <label htmlFor="finished-date" className="app-label">
                  Finished on
                </label>
                <input
                  id="finished-date"
                  type="date"
                  className="app-input"
                  max={localDateString()}
                  value={w.watchedDate}
                  onChange={(e) => w.setWatchedDate(e.target.value)}
                  disabled={w.saving}
                  required
                />
              </div>
            )}
            <NoteField
              id="entry-notes"
              label="Notes"
              title={item.title}
              subtitle={meta}
              placeholder="What stayed with you?"
              value={w.notes}
              onChange={w.setNotes}
              disabled={w.saving}
            />
          </>
        )}
        {w.duplicateError && (
          <p role="alert" className="app-note app-note-warn">
            This title is already in your collection. You can edit it from your
            library, or log another finished viewing.
          </p>
        )}
        {w.saveError && (
          <p role="alert" className="app-note app-note-danger">
            {w.saveError}
          </p>
        )}
      </div>
    </Sheet>
  )
}

export default function AddEntryPage() {
  const w = useAddEntryPage()
  const activeLabel =
    w.activeTab === 'movie'
      ? 'a movie'
      : w.activeTab === 'show'
        ? 'a show'
        : w.activeTab === 'game'
          ? 'a game'
          : 'a book'
  return (
    <main className="app-page">
      <div className="mx-auto max-w-4xl px-5 pt-7 md:pt-10">
        <h1 className="app-title">
          What’s your latest<span className="text-accent-soft">?</span>
        </h1>

        <div
          className="app-segmented mt-6"
          role="group"
          aria-label="Media type"
        >
          {categories.map(({ type, label, Icon }) => (
            <button
              key={type}
              type="button"
              aria-pressed={w.activeTab === type}
              onClick={() => w.setActiveTab(type)}
              className="!text-[13px]"
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="app-search mt-3">
          <Search size={20} aria-hidden="true" />
          <input
            aria-label="Search titles"
            type="search"
            className="app-input !min-h-14 !pr-12"
            placeholder={`Find ${activeLabel}…`}
            value={w.query}
            onChange={(e) => w.setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {w.searching && (
            <Loader2
              className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-accent-soft"
              size={20}
              aria-hidden="true"
            />
          )}
        </div>

        {w.saveFeedback && (
          <div role="status" className="app-note app-note-ok mt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{w.saveFeedback.title}</p>
                <p className="mt-0.5 text-sm text-gray-200">
                  {w.saveFeedback.detail}
                </p>
              </div>
              <button
                aria-label="Dismiss saved message"
                className="app-icon-button -mr-3 -mt-2 text-current"
                onClick={w.dismissSaveFeedback}
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 text-sm">
              <Link
                className="inline-flex min-h-11 items-center gap-1 font-semibold"
                to="/feed"
              >
                Share your thoughts <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link
                to="/library"
                className="inline-flex min-h-11 items-center font-semibold text-gray-200"
              >
                View collection
              </Link>
            </div>
          </div>
        )}

        {w.draftItem && !w.selectedItem && (
          <div className="app-panel mt-5 flex items-center gap-3 rounded-2xl p-3 pl-4">
            <RotateCcw size={18} className="shrink-0 text-butter-300" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted">Unfinished log</p>
              <p className="truncate text-sm font-semibold text-gray-50">
                {w.draftItem.title}
              </p>
            </div>
            <button
              className="app-button-secondary app-button-sm"
              onClick={w.resumeDraft}
            >
              Continue
            </button>
            <button
              className="app-icon-button -mr-1"
              aria-label="Discard entry draft"
              onClick={w.discardDraft}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {!w.draftStorageAvailable && (
          <p role="status" className="app-note app-note-warn mt-4">
            Your device couldn’t save this draft. Keep this page open until you
            finish.
          </p>
        )}

        {w.searchError ? (
          <div role="alert" className="app-empty mt-6">
            <PalMark size={56} />
            <h3 className="mt-3">A brief intermission.</h3>
            <p>{w.searchError}</p>
            <button onClick={w.retrySearch} className="app-button-primary mt-6">
              Try search again
            </button>
          </div>
        ) : w.query.trim() ? (
          <section className="mt-7" aria-label="Search results">
            <p className="mb-4 text-sm text-muted" aria-live="polite">
              {w.searching
                ? 'Finding your story…'
                : `${w.results.length} ${w.results.length === 1 ? 'title' : 'titles'} found`}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
              {w.results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  className="group min-w-0 rounded-2xl text-left"
                  aria-label={`Log ${item.title}`}
                  onClick={() => w.selectItem(item)}
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-surface-strong">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">
                        <Clapperboard size={36} strokeWidth={1.3} />
                      </div>
                    )}
                  </div>
                  <h2 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-gray-50 transition-colors group-hover:text-accent-soft">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {item.year || 'Release date unknown'}
                  </p>
                </button>
              ))}
            </div>
            {!w.searching && !w.results.length && (
              <p className="py-12 text-center text-sm text-muted">
                No matches this time. Try a different title or spelling.
              </p>
            )}
          </section>
        ) : (
          <section className="mt-14 text-center">
            <div className="mb-4 flex justify-center">
              <PalMark size={72} />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-50">
              What did you just finish?
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              Search for something you’ve watched, played, or read.
            </p>
          </section>
        )}
      </div>
      <LogSheet workflow={w} />
    </main>
  )
}
