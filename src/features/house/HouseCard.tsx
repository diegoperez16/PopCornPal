import { useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import type { MediaEntry } from '../../hooks/queries/useMediaQueries'
import HouseRing from './HouseRing'
import {
  HOUSES,
  HOUSE_LIST,
  SORTING_MINIMUM,
  isHouseId,
  sortByShelf,
  type HouseId,
} from './houseModel'

function Crest({ house }: { house: HouseId }) {
  const [wool, stripe] = HOUSES[house].colors
  return (
    <span
      className="flex h-11 w-11 items-center justify-center rounded-full"
      style={{ background: wool, boxShadow: `inset 0 0 0 3px ${stripe}` }}
    >
      <span
        className="h-4 w-4 rotate-45 rounded-[3px]"
        style={{ background: stripe }}
      />
    </span>
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
  if (themeId !== 'wizarding') return null

  const sorted = isHouseId(house) ? HOUSES[house] : null
  const proposal = sorted ? null : sortByShelf(entries)
  const shelfSize = entries.length

  return (
    <section
      aria-labelledby="house-heading"
      className="mb-7 rounded-2xl border border-gray-700 bg-gray-800/50 p-4"
    >
      <h3
        id="house-heading"
        className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-500"
      >
        Your house
      </h3>

      {sorted && !picking && (
        <div className="flex items-center gap-3">
          <HouseRing house={sorted.id}>
            <span className="block h-12 w-12 rounded-full bg-gray-900" />
          </HouseRing>
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

      {!sorted && !picking && proposal && (
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
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onChoose(proposal.house.id)}
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

      {!sorted && !picking && !proposal && (
        <div>
          <p className="text-xs leading-relaxed text-gray-400">
            The Sorting reads your shelf, and yours is still short. Log{' '}
            {Math.max(1, SORTING_MINIMUM - shelfSize)} more and it will have
            something to go on — or pick for yourself.
          </p>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="mt-3 min-h-11 w-full rounded-xl border border-gray-700 text-sm font-semibold text-gray-300"
          >
            Choose my own
          </button>
        </div>
      )}

      {picking && (
        <div className="grid grid-cols-2 gap-2">
          {HOUSE_LIST.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChoose(option.id)
                setPicking(false)
              }}
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
      )}
    </section>
  )
}
