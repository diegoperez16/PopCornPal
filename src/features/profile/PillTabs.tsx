import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type PillTab = {
  id: string
  label: string
  /** Shown beside the label when above zero. */
  count?: number
}

/**
 * One scrolling row of tabs with a single pill that slides between them.
 *
 * The pill is one absolutely positioned element measured against the active
 * button, rather than a background on each button. That is what makes the
 * change read as movement instead of a swap, and it costs one layout read per
 * selection.
 *
 * When the row is wider than the track, the clipped side fades out and a
 * chevron appears in its own cell at the end of the track, so it never sits on
 * top of a label. Tapping the chevron scrolls the strip along.
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
  const [edges, setEdges] = useState({ left: false, right: false })

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-active="true"]')
      setPill(active ? { left: active.offsetLeft, width: active.offsetWidth } : null)
      setEdges({
        left: list.scrollLeft > 4,
        right: list.scrollLeft + list.clientWidth < list.scrollWidth - 4,
      })
    }
    measure()
    // Labels and counts change width after data loads; keep the pill on top
    // and the edge hints honest.
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    list.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      list.removeEventListener('scroll', measure)
    }
  }, [value, tabs])

  // Only a change of tab scrolls the strip. On mount it must stay put: a strip
  // below the fold would otherwise drag the whole page down to itself on load.
  const shown = useRef(value)
  useEffect(() => {
    if (shown.current === value) return
    shown.current = value
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

  const nudge = (direction: 1 | -1) => {
    const list = listRef.current
    list?.scrollBy({ left: direction * list.clientWidth * 0.6, behavior: 'smooth' })
  }

  const fade = edges.left && edges.right ? 'both' : edges.left ? 'left' : edges.right ? 'right' : 'none'

  return (
    <div className="pill-tabs">
      {edges.left && (
        <button type="button" onClick={() => nudge(-1)} aria-label="Earlier tabs" className="pill-tabs-edge">
          <ChevronLeft size={18} />
        </button>
      )}
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        data-fade={fade}
        className="pill-tabs-scroller no-scrollbar relative flex min-w-0 flex-1 gap-1 overflow-x-auto"
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
              className={`relative z-10 flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-colors duration-200 ${
                current ? 'text-accent-on' : 'text-muted hover:text-gray-50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={current ? 'text-accent-on/60' : 'text-gray-500'}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {edges.right && (
        <button type="button" onClick={() => nudge(1)} aria-label="More tabs" className="pill-tabs-edge">
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}
