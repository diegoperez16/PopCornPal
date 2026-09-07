import { BookOpen, Film, Gamepad2, Star, Tv } from 'lucide-react'
import VerdictMark from '../verdict/VerdictMark'
import { verdictFor } from '../verdict/verdictModel'
import type { MediaEntry } from '../../hooks/queries/useMediaQueries'
import ProgressiveImg from '../../components/ProgressiveImg'

const mediaIcons = { movie: Film, show: Tv, game: Gamepad2, book: BookOpen }
const mediaLabels = {
  movie: 'Movie',
  show: 'Series',
  game: 'Game',
  book: 'Book',
}

export default function LibraryEntryCard({
  entry,
  view,
  onSelect,
}: {
  entry: MediaEntry
  view: 'grid' | 'list'
  onSelect: (entry: MediaEntry) => void
}) {
  const Icon = mediaIcons[entry.media_type]
  const isList = view === 'list'
  const verdict = verdictFor(entry.rating, Boolean(entry.dumpstered))
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      aria-label={`View and edit ${entry.title}`}
      className={`group min-w-0 text-left ${isList ? 'flex items-center gap-4 rounded-2xl border border-gray-700 bg-gray-800 p-3' : 'flex flex-col self-start rounded-2xl'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent`}
    >
      <div
        className={`relative overflow-hidden border border-white/10 bg-surface-strong ${isList ? 'h-24 w-16 shrink-0 rounded-lg' : 'w-full aspect-[2/3] rounded-2xl shadow-lg shadow-black/15'}`}
      >
        {entry.cover_image_url ? (
          <ProgressiveImg
            src={entry.cover_image_url}
            alt=""
            wrapperClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-[#9a9691]">
            <Icon
              className={isList ? 'h-6 w-6' : 'h-10 w-10'}
              strokeWidth={1.2}
              aria-hidden="true"
            />
            {!isList && (
              <span className="text-[10px] uppercase tracking-[0.2em]">
                {mediaLabels[entry.media_type]}
              </span>
            )}
          </div>
        )}
        {!isList && verdict && (
          <span
            className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-white/10 bg-gray-900/95 py-1 pl-1 pr-2 text-xs font-semibold tabular-nums text-butter-gold"
            title={verdict.name}
          >
            <VerdictMark verdict={verdict.id} size={22} />
            {entry.dumpstered ? (
              <span className="sr-only">{verdict.name}</span>
            ) : (
              <>
                {entry.rating!.toFixed(1)}
                <span className="sr-only">out of 10 — {verdict.name}</span>
              </>
            )}
          </span>
        )}
      </div>
      <div className={isList ? 'min-w-0 flex-1 py-1' : 'mt-3 px-0.5'}>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-parchment transition-colors group-hover:text-accent-warm sm:text-base">
          {entry.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <span>{mediaLabels[entry.media_type]}</span>
          {entry.year && (
            <>
              <span aria-hidden="true">·</span>
              <span>{entry.year}</span>
            </>
          )}
        </p>
        {isList && entry.notes && (
          <p className="mt-2 line-clamp-1 text-xs text-muted">
            {entry.notes}
          </p>
        )}
      </div>
      {isList && entry.rating !== null && (
        <span className="flex shrink-0 items-center gap-1 pr-1 text-sm font-semibold text-butter-gold">
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          {entry.rating.toFixed(1)}
          <span className="sr-only">out of 10</span>
        </span>
      )}
    </button>
  )
}
