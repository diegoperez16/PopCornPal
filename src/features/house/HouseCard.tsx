import { useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import type { MediaEntry } from '../../hooks/queries/useMediaQueries'
import { Loader2, Sparkles } from 'lucide-react'
import {
  HOUSES,
  HOUSE_LIST,
  SORTING_MINIMUM,
  isHouseId,
  type HouseId,
} from './houseModel'
import { useSorting } from './useSorting'
import SectionHeader from '../profile/SectionHeader'

function Crest({ house, size = 52 }: { house: HouseId; size?: number }) {
  return (
    <img
      src={`/houses/crest-${house}.webp`}
      alt=""
      width={size}
      height={Math.round(size * 1.13)}
      loading="lazy"
      decoding="async"
      className="shrink-0 object-contain"
    />
  )
}

/**
 * The Sorting. It reads the shelf and proposes, but the chosen house always
 * wins — being told who you are is the opposite of what this is for.
 *
 * Only shown in the Wizarding season, so the whole layer belongs to people who
 * opted into it.
 */
export default function HouseCard({
  house,
  entries,
  onChoose,
}: {
  house: string | null | undefined
  entries: readonly MediaEntry[]
  onChoose: (house: HouseId) => void
}) {
  const themeId = useThemeStore((state) => state.theme.id)
  const [picking, setPicking] = useState(false)
  const [readNotes, setReadNotes] = useState(false)
  const { sorting, thinking, usedFallback, sort, clear } = useSorting(entries)

  /**
   * Choosing settles it. The proposal has to be dropped as well as saved —
   * leaving it up meant the card kept re-rendering the Sorting's house, so a
   * manual pick appeared to do nothing and the house looked stuck.
   */
  const choose = (id: HouseId) => {
    onChoose(id)
    clear()
    setPicking(false)
  }
  if (themeId !== 'wizarding') return null

  // A fresh proposal outranks the saved house until it is accepted or dismissed.
  const sorted = sorting ? null : isHouseId(house) ? HOUSES[house] : null
  const proposal = sorting
  const enoughShelf = entries.length >= SORTING_MINIMUM
  const shelfSize = entries.length

  return (
    <section
      aria-labelledby="house-heading"
      className="mb-7"
    >
      <SectionHeader title="Your house" />

      {thinking && (
        <div className="flex items-center gap-3 py-1">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent" />
          <p className="text-sm text-gray-300">
            The Sorting is reading your shelf…
          </p>
        </div>
      )}

      {sorted && !picking && !thinking && (
        <div className="flex items-center gap-3">
          <Crest house={sorted.id} size={54} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-100">{sorted.name}</p>
            <p className="mt-0.5 text-xs leading-snug text-gray-500">
              {sorted.trait}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="min-h-11 shrink-0 text-xs font-semibold text-accent underline underline-offset-4"
          >
            Change
          </button>
        </div>
      )}

      {!sorted && !picking && !thinking && proposal && (
        <div>
          <div className="flex items-center gap-3">
            <Crest house={proposal.house.id} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-100">
                The Sorting says {proposal.house.name}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
                {proposal.because}
              </p>
              {usedFallback && (
                <p className="mt-1 text-[11px] text-gray-600">
                  Sorted on this device — the Sorting could not be reached.
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => choose(proposal.house.id)}
              className="min-h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-accent-on"
            >
              That&rsquo;s me
            </button>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="min-h-11 flex-1 rounded-xl border border-gray-700 text-sm font-semibold text-gray-300"
            >
              Choose my own
            </button>
          </div>
        </div>
      )}

      {!sorted && !picking && !thinking && !proposal && (
        <div>
          <p className="text-xs leading-relaxed text-gray-400">
            {enoughShelf
              ? 'The Sorting reads what you have watched, played and read, and how you rate it.'
              : `The Sorting reads your shelf, and yours is still short. Log ${Math.max(1, SORTING_MINIMUM - shelfSize)} more and it will have something to go on — or pick for yourself.`}
          </p>
          {enoughShelf && (
            <label className="mt-3 flex items-start gap-2 text-xs leading-snug text-gray-500">
              <input
                type="checkbox"
                checked={readNotes}
                onChange={(event) => setReadNotes(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              />
              <span>
                Also read my notes. They make the reason sharper, but your
                writing leaves your library to be read.
              </span>
            </label>
          )}
          <div className="mt-3 flex gap-2">
            {enoughShelf && (
              <button
                type="button"
                disabled={thinking}
                onClick={() => void sort({ includeNotes: readNotes })}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-on disabled:opacity-60"
              >
                {thinking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reading your shelf…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Sort me
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="min-h-11 flex-1 rounded-xl border border-gray-700 text-sm font-semibold text-gray-300"
            >
              Choose my own
            </button>
          </div>
        </div>
      )}

      {picking && !thinking && (
        <>
        {/* Being sorted once should not be final — the shelf keeps growing. */}
        {enoughShelf && (
          <button
            type="button"
            disabled={thinking}
            onClick={() => {
              setPicking(false)
              void sort({ includeNotes: readNotes })
            }}
            className="mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-accent/60 bg-accent/10 text-sm font-semibold text-accent-soft disabled:opacity-60"
          >
            {thinking ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Reading your shelf…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Sort me again</>
            )}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {HOUSE_LIST.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => choose(option.id)}
              className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                option.id === house
                  ? 'border-accent bg-accent/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <Crest house={option.id} />
              <span className="min-w-0 text-xs font-semibold text-gray-100">
                {option.name}
              </span>
            </button>
          ))}
        </div>
        </>
      )}
    </section>
  )
}
