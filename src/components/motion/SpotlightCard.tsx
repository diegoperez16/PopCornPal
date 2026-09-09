import { useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'

/**
 * A card that lights up under the finger, in the season's own accent.
 *
 * The position is written straight onto the element as CSS variables rather
 * than held in state — a spotlight that re-rendered React on every pointer
 * move would be the most expensive decoration on the page.
 *
 * Bound to pointer events rather than hover so it works on a phone: on touch
 * the light appears where you press and fades when you let go, which doubles
 * as the press feedback the card would otherwise need.
 */
export default function SpotlightCard({
  children,
  className = '',
  ...rest
}: { children: ReactNode } & ComponentPropsWithoutRef<'div'>) {
  const ref = useRef<HTMLDivElement>(null)

  const light = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${event.clientX - box.left}px`)
    el.style.setProperty('--spot-y', `${event.clientY - box.top}px`)
    el.style.setProperty('--spot-on', '1')
  }
  const dim = () => ref.current?.style.setProperty('--spot-on', '0')

  return (
    <div
      ref={ref}
      className={`spotlight ${className}`}
      onPointerMove={light}
      onPointerDown={light}
      onPointerUp={dim}
      onPointerLeave={dim}
      onPointerCancel={dim}
      {...rest}
    >
      {children}
    </div>
  )
}
