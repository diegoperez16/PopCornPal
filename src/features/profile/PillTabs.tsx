import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type PillTab = {
  id: string
  label: string
  /** Shown beside the label when above zero. */
  count?: number
}

/**
 * One scrolling row of tabs with a single pill that slides between them.
 *
 * The profile had two tab strips built two different ways — outlined chips for
 * the top tens, solid gradients for the status filter — so the page looked
 * assembled rather than designed. This is both of them now.
 *
 * The pill is one absolutely positioned element measured against the active
 * button, rather than a background on each button. That is what makes the
 * change read as movement instead of a swap, and it costs one layout read per
 * selection.
 */
export default function PillTabs({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: readonly PillTab[]
  value: string
  onChange: (id: string) => void
  ariaLabel: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  // The first paint places the pill with no transition; every later move
  // animates. Otherwise the pill slides in from the left edge on load.
  const [placed, setPlaced] = useState(false)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-active="true"]')
      setPill(active ? { left: active.offsetLeft, width: active.offsetWidth } : null)
    }
    measure()
    // Labels and counts change width after data loads; keep the pill on top.
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [value, tabs])

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    // `block: 'nearest'` matters — without it, choosing a tab yanks the whole
    // page vertically to centre the strip.
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [value])

  useEffect(() => {
    if (!pill || placed) return
    // A frame later: the pill has been painted where it belongs, so from here
    // on a change of tab is something to animate rather than to jump.
    const frame = requestAnimationFrame(() => setPlaced(true))
    return () => cancelAnimationFrame(frame)
  }, [pill, placed])

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      // The track's background is painted on the scroll container itself, so it
      // stays put while the tabs slide beneath it.
      className="no-scrollbar relative flex gap-1 overflow-x-auto rounded-full bg-gray-800/40 p-1 ring-1 ring-inset ring-gray-700/50"
    >
      {pill && (
        <span
          aria-hidden="true"
          className="pill-tabs-indicator"
          style={{
            transform: `translate3d(${pill.left}px, 0, 0)`,
            width: `${pill.width}px`,
            transition: placed
              ? 'transform .38s cubic-bezier(.34,1.4,.5,1), width .38s cubic-bezier(.34,1.4,.5,1)'
              : 'none',
          }}
        />
      )}
      {tabs.map((tab) => {
        const current = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={current}
            data-active={current}
            onClick={() => onChange(tab.id)}
            className={`relative z-10 flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors duration-200 ${
              current ? 'text-accent-on' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={current ? 'text-accent-on/60' : 'text-gray-600'}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
