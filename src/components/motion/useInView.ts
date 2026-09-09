import { useEffect, useRef, useState } from 'react'

/**
 * Whether the person has asked their device to calm down. Every motion
 * primitive in here checks it and renders the finished state instead.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return reduced
}

/**
 * Fires once, the first time the element scrolls into view, then stops
 * watching. Entrances that replay every time you scroll past are a novelty the
 * second time and an irritation the fifth.
 */
export function useInView<T extends HTMLElement>(
  rootMargin = '0px 0px -12% 0px'
) {
  const ref = useRef<T>(null)
  // Somewhere without an observer — an old browser, a test renderer — every
  // element counts as seen, so content never hides behind an entrance that
  // will not run.
  const [seen, setSeen] = useState(
    () => typeof IntersectionObserver !== 'function'
  )

  useEffect(() => {
    if (seen) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [seen, rootMargin])

  return [ref, seen] as const
}
