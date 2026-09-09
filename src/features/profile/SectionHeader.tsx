/**
 * One heading style for every section of the profile.
 *
 * The page had four sections that each labelled themselves slightly
 * differently, all at the same visual weight, so nothing led and the page read
 * as a list of settings. A single header — a title, an optional count, and a
 * hairline that runs to the edge — gives the page a rhythm to follow.
 */
export default function SectionHeader({
  title,
  count,
  action,
}: {
  title: string
  count?: number
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="flex shrink-0 items-baseline gap-2 text-sm font-bold tracking-tight text-gray-100">
        {title}
        {count !== undefined && count > 0 && (
          <span className="text-xs font-semibold tabular-nums text-gray-500">
            {count}
          </span>
        )}
      </h2>
      {/* Fills whatever space the title leaves, so headings align down the page
          without needing to agree on a width. */}
      <span
        aria-hidden="true"
        className="h-px min-w-4 flex-1 bg-gradient-to-r from-gray-700 to-transparent"
      />
      {action}
    </div>
  )
}
