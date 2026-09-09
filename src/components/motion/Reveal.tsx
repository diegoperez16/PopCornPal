import type { ReactNode } from 'react'
import { useInView, usePrefersReducedMotion } from './useInView'

/**
 * Sections arrive rather than appear: a short lift out of a blur as they reach
 * the viewport.
 *
 * This is the cheapest way to make a long scrolling page feel alive on a phone,
 * where there is no cursor to react to — the scroll itself becomes the input.
 * Deliberately one-shot and short; a page that keeps animating is a page you
 * cannot read.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  /** Milliseconds, for staggering siblings. Keep under ~150. */
  delay?: number
  className?: string
}) {
  const reduced = usePrefersReducedMotion()
  const [ref, seen] = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={className}
      style={
        reduced
          ? undefined
          : {
              opacity: seen ? 1 : 0,
              transform: seen ? 'none' : 'translate3d(0, 20px, 0)',
              // Cleared to `none` once seen so the element stops being a
              // containing block for anything positioned inside it.
              filter: seen ? 'none' : 'blur(7px)',
              transition:
                `opacity .6s cubic-bezier(.22,1,.36,1) ${delay}ms,` +
                `transform .6s cubic-bezier(.22,1,.36,1) ${delay}ms,` +
                `filter .6s cubic-bezier(.22,1,.36,1) ${delay}ms`,
            }
      }
    >
      {children}
    </div>
  )
}
