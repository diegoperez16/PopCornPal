import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  Clapperboard,
  Film,
  Gamepad2,
  Loader2,
  Search,
  Star,
  Tv,
  X,
} from 'lucide-react'
import DecimalRating from '../components/DecimalRating'
import { useAddEntryPage, type WatchStatus } from '../hooks/useAddEntryPage'
import { localDateString } from '../lib/addEntryDraft'

const categories = [
  { type: 'movie', label: 'Movies', Icon: Film },
  { type: 'show', label: 'Shows', Icon: Tv },
  { type: 'game', label: 'Games', Icon: Gamepad2 },
  { type: 'book', label: 'Books', Icon: BookOpen },
] as const
const statuses: { value: WatchStatus; title: string; detail: string }[] = [
  {
    value: 'completed',
    title: 'Finished',
    detail: 'Another story in the books',
  },
  {
    value: 'in-progress',
    title: 'In progress',
    detail: 'Enjoying this one right now',
  },
  { value: 'planned', title: 'Up next', detail: 'Save it for a little later' },
  {
    value: 'logged',
    title: 'Add to library',
    detail: 'Part of your collection',
  },
]

type Workflow = ReturnType<typeof useAddEntryPage>
function LogSheet({ workflow: w }: { workflow: Workflow }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const item = w.selectedItem
  useEffect(() => {
    const element = dialog.current
    if (item) element?.showModal()
    else element?.close()
    return () => element?.close()
  }, [item])
  if (!item) return null
  return (
    <dialog
      ref={dialog}
      aria-labelledby="log-title"
      className="log-sheet"
      onCancel={(e) => {
        e.preventDefault()
        w.handleClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) w.handleClose()
      }}
    >
      <div className="flex flex-col max-h-[90dvh]">
        <header className="flex shrink-0 items-start gap-4 border-b border-white/10 p-5">
          {item.image ? (
            <img
              src={item.image}
              alt=""
              className="h-24 w-16 rounded-lg object-cover bg-gray-800"
            />
          ) : (
            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-[#36302d]">
              <Clapperboard size={25} />
            </div>
          )}
          <div className="min-w-0 pt-1 flex-1">
            <p className="app-kicker mb-2">
              {item.type} {item.year && `· ${item.year}`}
            </p>
            <h2
              id="log-title"
              className="text-xl font-semibold leading-tight tracking-tight"
            >
              {item.title}
            </h2>
            <p className="text-xs text-gray-400 mt-2">
              Make a little space for this story.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close log; keep draft"
            disabled={w.saving}
            onClick={w.handleClose}
            className="app-icon-button shrink-0 -mr-2 -mt-2"
          >
            <X size={20} />
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain p-5 space-y-6">
          {item.type === 'show' && (
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#141517] p-1">
              <button
                className={`min-h-11 rounded-lg text-sm ${!w.episodeMode ? 'bg-[#343332] text-white' : 'text-gray-400'}`}
                aria-pressed={!w.episodeMode}
                onClick={w.exitEpisodeMode}
              >
                Whole show
              </button>
              <button
                className={`min-h-11 rounded-lg text-sm ${w.episodeMode ? 'bg-[#343332] text-white' : 'text-gray-400'}`}
                aria-pressed={w.episodeMode}
                onClick={w.enterEpisodeMode}
              >
                By episode
              </button>
            </div>
          )}
          {w.episodeMode ? (
            <>
              <div>
                <label htmlFor="season" className="auth-label">
                  Season
                </label>
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
              </div>
              {w.seasonError && (
                <p role="alert" className="text-sm text-rose-200">
                  {w.seasonError}{' '}
                  <button onClick={w.retrySeasons} className="underline">
                    Retry seasons
                  </button>
                </p>
              )}
              {w.episodeError && (
                <p role="alert" className="text-sm text-rose-200">
                  {w.episodeError}{' '}
                  <button onClick={w.retryEpisodes} className="underline">
                    Retry episodes
                  </button>
                </p>
              )}
              {(w.loadingSeasons || w.loadingEpisodes) && (
                <p role="status" className="text-sm text-gray-400">
                  Loading episodes…
                </p>
              )}
              <div className="space-y-3">
                {w.episodes.map((episode) => (
                  <div
                    key={episode.episode_number}
                    className="flex items-center gap-3 rounded-xl border border-white/10 p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="app-kicker">
                        Episode {episode.episode_number}
                      </p>
                      <p className="text-sm mt-1 truncate">{episode.name}</p>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="sr-only">Rating for {episode.name}</span>
                      <input
                        className="app-input !w-20 !min-h-11 text-center !p-2"
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
                  <p className="text-sm text-gray-400">
                    There are no episodes available for this season yet.
                  </p>
                )}
              <p className="text-xs text-gray-400">
                {w.pendingRatings.length} episode ratings ready. Your show is
                also added to your collection.
              </p>
            </>
          ) : (
            <>
              <fieldset disabled={w.saving}>
                <legend className="auth-label">
                  Where are you with this one?
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => w.setStatus(status.value)}
                      aria-pressed={w.status === status.value}
                      className={`min-h-[78px] rounded-xl border p-3 text-left ${w.status === status.value ? 'border-[#ff8175] bg-[#ff655b]/10' : 'border-white/10 bg-[#141517]'}`}
                    >
                      <span
                        className={`block text-sm font-semibold ${w.status === status.value ? 'text-[#ff9b8e]' : 'text-gray-200'}`}
                      >
                        {status.title}
                      </span>
                      <span className="block text-[10px] leading-relaxed text-gray-400 mt-1">
                        {status.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {(w.status === 'completed' || w.status === 'logged') && (
                <div>
                  <p className="auth-label">
                    Your rating{' '}
                    <span className="text-gray-400 text-xs font-normal">
                      · optional
                    </span>
                  </p>
                  <DecimalRating value={w.rating} onChange={w.setRating} />
                </div>
              )}
              {w.status === 'completed' && (
                <div>
                  <label htmlFor="finished-date" className="auth-label">
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
              <div>
                <label htmlFor="entry-notes" className="auth-label">
                  A few thoughts{' '}
                  <span className="text-gray-400 text-xs font-normal">
                    · optional
                  </span>
                </label>
                <textarea
                  id="entry-notes"
                  rows={3}
                  className="app-input resize-none"
                  placeholder="The scene that stayed with you. The way it made you feel."
                  value={w.notes}
                  onChange={(e) => w.setNotes(e.target.value)}
                  disabled={w.saving}
                  maxLength={10000}
                />
              </div>
            </>
          )}
          {w.duplicateError && (
            <p
              role="alert"
              className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200"
            >
              This title is already in your collection. You can edit it from
              your library, or log another finished viewing.
            </p>
          )}
          {w.saveError && (
            <p
              role="alert"
              className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-200"
            >
              {w.saveError}
            </p>
          )}
        </div>
        <footer className="shrink-0 border-t border-white/10 px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] bg-[#1a1b1e]">
          <button
            className="app-button-primary w-full"
            onClick={() => void w.handleSave()}
            disabled={w.saving || (w.episodeMode && !w.pendingRatings.length)}
          >
            {w.saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving your story…
              </>
            ) : (
              <>
                <Check size={18} />
                {w.episodeMode ? 'Save episode ratings' : 'Save this story'}
              </>
            )}
          </button>
          <p className="text-[10px] mt-2 text-center text-gray-400">
            Your collection is yours. Share a post with friends anytime.
          </p>
        </footer>
      </div>
    </dialog>
  )
}

export default function AddEntryPage() {
  const w = useAddEntryPage()
  return (
    <main className="app-page">
      <div className="mx-auto max-w-4xl px-5 pt-8 md:pt-10">
        <p className="app-kicker mb-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff8175]" />
          Roll the credits
        </p>
        <h1 className="app-title">
          What’s your latest<span className="text-[#ff8175]">?</span>
        </h1>
        <p className="app-muted text-sm leading-relaxed mt-3 max-w-sm">
          A movie night. One more episode. A new favorite.
          <br />
          Give it a place in your story.
        </p>
        <div
          className="flex gap-2 mt-7 mb-5 overflow-x-auto no-scrollbar"
          role="group"
          aria-label="Media type"
        >
          {categories.map(({ type, label, Icon }) => (
            <button
              key={type}
              aria-pressed={w.activeTab === type}
              onClick={() => w.setActiveTab(type)}
              className={`inline-flex shrink-0 min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium border ${w.activeTab === type ? 'bg-[#f3ece2] text-[#23201e] border-[#f3ece2]' : 'border-[#353537] text-gray-400'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-4 text-gray-400" size={20} />
          <input
            aria-label="Search titles"
            type="search"
            className="app-input !pl-12 !pr-12 !min-h-14"
            placeholder={`Find ${w.activeTab === 'movie' ? 'a movie' : w.activeTab === 'show' ? 'a show' : w.activeTab === 'game' ? 'a game' : 'a book'}…`}
            value={w.query}
            onChange={(e) => w.setQuery(e.target.value)}
            autoComplete="off"
          />
          {w.searching && (
            <Loader2
              className="absolute top-4 right-4 animate-spin text-[#ff8175]"
              size={20}
            />
          )}
        </div>
        {w.saveFeedback && (
          <div
            role="status"
            className="mt-5 rounded-2xl border border-[#9bb180]/30 bg-[#9bb180]/10 p-4"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#d3e5bb]">
                  {w.saveFeedback.title}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  {w.saveFeedback.detail}
                </p>
              </div>
              <button
                aria-label="Dismiss saved message"
                className="app-icon-button -mr-2 -mt-2"
                onClick={w.dismissSaveFeedback}
              >
                <X size={17} />
              </button>
            </div>
            <div className="flex gap-5 mt-4 text-xs">
              <Link
                className="text-[#d3e5bb] inline-flex items-center gap-1"
                to="/feed"
              >
                Share your thoughts <ArrowRight size={13} />
              </Link>
              <Link to="/library" className="text-gray-300">
                View collection
              </Link>
            </div>
          </div>
        )}
        {w.draftItem && !w.selectedItem && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-[#d6b78e]/20 bg-[#d6b78e]/5 p-4">
            <div>
              <p className="app-kicker mb-1">Your unfinished scene</p>
              <p className="text-sm">{w.draftItem.title}</p>
            </div>
            <button
              className="min-h-11 text-sm font-semibold text-[#e4c398]"
              onClick={w.resumeDraft}
            >
              Continue
            </button>
            <button
              className="app-icon-button"
              aria-label="Discard entry draft"
              onClick={w.discardDraft}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {!w.draftStorageAvailable && (
          <p role="status" className="mt-4 text-xs text-amber-200">
            Your device couldn’t save this draft. Keep this page open until you
            finish.
          </p>
        )}
        {w.searchError ? (
          <div role="alert" className="app-panel mt-6 p-6 rounded-2xl">
            <h2 className="font-semibold">A brief intermission.</h2>
            <p className="text-sm text-gray-400 mt-2">{w.searchError}</p>
            <button onClick={w.retrySearch} className="app-button-primary mt-4">
              Try search again
            </button>
          </div>
        ) : w.query.trim() ? (
          <section className="mt-7" aria-label="Search results">
            <p className="app-kicker mb-4" aria-live="polite">
              {w.searching
                ? 'Finding your story…'
                : `${w.results.length} titles found`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6">
              {w.results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  className="text-left group min-w-0"
                  aria-label={`Log ${item.title}`}
                  onClick={() => w.selectItem(item)}
                >
                  <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-[#232326] border border-white/10">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-opacity group-hover:opacity-80"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <Clapperboard size={36} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                  <h2 className="mt-3 font-semibold text-sm leading-snug line-clamp-2">
                    {item.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.year || 'Release date unknown'}
                  </p>
                </button>
              ))}
            </div>
            {!w.searching && !w.results.length && (
              <p className="py-12 text-sm text-gray-400 text-center">
                No matches this time. Try a different title or spelling.
              </p>
            )}
          </section>
        ) : (
          <section className="log-empty mt-8 rounded-3xl border border-[#3c3830] p-7 md:p-10">
            <div className="flex items-center justify-between">
              <span className="app-kicker">Every story counts</span>
              <Star className="text-[#c2a57e]" size={20} strokeWidth={1.3} />
            </div>
            <h2 className="font-serif italic text-[#e2c7a5] text-[29px] leading-tight mt-8">
              Some stories
              <br />
              stay with you.
            </h2>
            <p className="text-sm text-[#b8b0a5] mt-4 leading-relaxed max-w-xs">
              Find a title above to rate it, remember it, or save it for your
              next movie night.
            </p>
            <div className="flex items-center gap-3 mt-8 border-t border-[#d5b787]/15 pt-5 text-[10px] uppercase tracking-[.16em] text-[#c7b79f]">
              <span>Find it</span>
              <span className="opacity-30">/</span>
              <span>Make it yours</span>
              <span className="opacity-30">/</span>
              <span>Pass it on</span>
            </div>
          </section>
        )}
      </div>
      <LogSheet workflow={w} />
    </main>
  )
}
