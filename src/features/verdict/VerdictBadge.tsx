import VerdictMark from './VerdictMark'
import { verdictFor } from './verdictModel'

/**
 * The live verdict beside a rating control: as the number moves, Poppy's face
 * changes with it, so rating something feels like getting a reaction rather
 * than filling in a field.
 */
export default function VerdictBadge({
  rating,
  dumpstered = false,
  size = 34,
  showName = true,
}: {
  rating: number | null
  dumpstered?: boolean
  size?: number
  showName?: boolean
}) {
  const verdict = verdictFor(rating, dumpstered)
  if (!verdict) return null

  return (
    <span className="flex shrink-0 items-center gap-2">
      <VerdictMark verdict={verdict.id} size={size} />
      {showName && (
        <span className="text-xs font-semibold text-gray-300">
          {verdict.name}
        </span>
      )}
    </span>
  )
}
