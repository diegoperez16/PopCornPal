import { useEffect, type RefObject } from 'react'

/**
 * Keeps a fixed surface inside the visible part of the screen while the
 * on-screen keyboard is up.
 *
 * iOS Safari never shrinks the layout viewport for the keyboard: it shrinks
 * the visual viewport and scrolls it, so a bottom sheet or a full-screen
 * composer sized in dvh ends up half hidden behind the keys and the field
 * you are typing into disappears. This writes the visible box onto the
 * element as CSS variables and flags it with data-keyboard while a keyboard
 * is showing; the stylesheet does the rest.
 */
export function useKeyboardFit(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const viewport = window.visualViewport
    const element = ref.current
    if (!viewport || !element) return

    const update = () => {
      const hidden = window.innerHeight - viewport.height
      if (hidden > 120) {
        element.style.setProperty('--vv-height', `${viewport.height}px`)
        element.style.setProperty('--vv-top', `${viewport.offsetTop}px`)
        element.style.setProperty(
          '--vv-bottom',
          `${Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height)}px`
        )
        element.dataset.keyboard = 'true'
        // The box just got shorter; bring the field being typed into back.
        const active = document.activeElement
        if (active instanceof HTMLElement && element.contains(active)) {
          active.scrollIntoView({ block: 'nearest' })
        }
      } else {
        element.style.removeProperty('--vv-height')
        element.style.removeProperty('--vv-top')
        element.style.removeProperty('--vv-bottom')
        delete element.dataset.keyboard
      }
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [ref])
}
