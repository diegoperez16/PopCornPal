import { useEffect, useState } from 'react'
import { useInView, usePrefersReducedMotion } from './useInView'

/**
 * A number that rolls up from zero when it first comes into view.
 *
 * Worth the machinery only because these particular numbers are the point of
 * the profile — how much you have watched, how hard you rate. Counting them
 * out loud makes the strip read as an achievement rather than a table.
 */
export default function CountUp({
  value,
  decimals = 0,
  duration = 850,
  className,
}: {
  value: number
  decimals?: number
  duration?: number
  className?: string
}) {
  const reduced = usePrefersReducedMotion()
  const [ref, seen] = useInView<HTMLSpanElement>()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!seen || reduced) return
    let frame = 0
    const started = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      // Ease-out cubic: fast off the mark, settles gently on the real number.
      setShown(value * (1 - Math.pow(1 - progress, 3)))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [seen, value, duration, reduced])

  return (
    <span ref={ref} className={className}>
      {(reduced ? value : shown).toFixed(decimals)}
    </span>
  )
}
