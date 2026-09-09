import { useMemo } from 'react'
import type { MediaEntry } from '../../hooks/queries/useMediaQueries'
import { collectUniqueMedia } from '../library/libraryModel'
import VerdictMark from '../verdict/VerdictMark'
import { verdictFor } from '../verdict/verdictModel'
import CountUp from '../../components/motion/CountUp'
import SpotlightCard from '../../components/motion/SpotlightCard'
import { Layers } from 'lucide-react'

/**
 * What someone has actually done, in the app's own language.
 *
 * A profile whose only numbers are two follower counts reads like a settings
 * page. Goldens and Dumpsters are used rather than generic totals because they
 * are this app's vocabulary — the same marks that appear on the shelf — and a
 * count of Dumpsters says more about a person than a count of entries does.
 *
 * The numbers count up on arrival and the cells light under the finger. Both
 * are decoration, and both are here because this strip is the one place on the
 * page that is purely about you being pleased with yourself.
 */
export default function ProfileStats({
  entries,
}: {
  entries: readonly MediaEntry[]
}) {
  const stats = useMemo(() => {
    // Per-title, not per-row: a film logged as both watched and shelved is one
    // thing you have seen, not two.
    const titles = collectUniqueMedia(entries)
    const rated = titles.filter(
      (entry) => !entry.dumpstered && typeof entry.rating === 'number'
    )
    const average = rated.length
      ? rated.reduce((sum, entry) => sum + (entry.rating as number), 0) /
        rated.length
      : null
    return {
      titles: titles.length,
      average,
      goldens: rated.filter((entry) => verdictFor(entry.rating)?.id === 'golden')
        .length,
      dumpsters: titles.filter((entry) => entry.dumpstered).length,
    }
  }, [entries])

  if (stats.titles === 0) return null

  // Every cell is topped by the mark it is about. Average wears whichever
  // Poppy its own number earns — so the strip tells you what kind of critic you
  // are before you have read a single digit.
  const averageMark = verdictFor(stats.average)?.id

  const cells = [
    {
      key: 'titles',
      value: stats.titles,
      label: 'Logged',
      icon: <Layers className="h-[15px] w-[15px] text-gray-500" strokeWidth={2.2} />,
    },
    {
      key: 'average',
      value: stats.average,
      decimals: 1,
      label: 'Average',
      icon: averageMark ? <VerdictMark verdict={averageMark} size={18} /> : null,
    },
    {
      key: 'golden',
      value: stats.goldens,
      label: 'Golden',
      icon: <VerdictMark verdict="golden" size={18} />,
    },
    {
      key: 'dumpster',
      value: stats.dumpsters,
      label: 'Dumpster',
      icon: <VerdictMark verdict="dumpster" size={18} />,
    },
  ]

  return (
    <dl className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {cells.map((cell, index) => (
        <SpotlightCard
          key={cell.key}
          className="group flex flex-col items-center gap-1 overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-800/40 px-1 py-3 transition-colors duration-300 hover:border-gray-600 hover:bg-gray-800/70"
        >
          {/* A hairline of the season's accent along the top edge, brightening
              on approach — enough to make the cell feel like an object. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="flex h-[18px] items-center">{cell.icon}</span>
          <dd className="text-xl font-bold leading-none tabular-nums text-gray-50">
            {cell.value === null ? (
              '—'
            ) : (
              <CountUp
                value={cell.value}
                decimals={cell.decimals ?? 0}
                // Staggered so the row reads left to right instead of
                // flickering all at once.
                duration={750 + index * 90}
              />
            )}
          </dd>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            {cell.label}
          </dt>
        </SpotlightCard>
      ))}
    </dl>
  )
}
