// The layout holds a fixed scale so it keeps an app's proportions instead of
// a page's. The viewport meta covers Android and the installed app; iOS Safari
// deliberately ignores user-scalable=no in a browser tab, so pinch has to be
// cancelled at the gesture level there as well.
//
// Trade-off, deliberate: pinch is normally a reader's only way to enlarge text
// in a tab. Body copy is therefore kept at 16px or larger, and the iOS
// system-wide Accessibility zoom still magnifies the whole screen.
const PINCH_GESTURES = ['gesturestart', 'gesturechange', 'gestureend']

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // iOS Safari predates display-mode and exposes its own flag.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Cancels WebKit pinch-to-zoom, which the viewport meta cannot disable in a tab. */
export function lockPinchZoom() {
  const cancel = (event: Event) => event.preventDefault()
  for (const type of PINCH_GESTURES) {
    document.addEventListener(type, cancel, { passive: false })
  }
  return () => {
    for (const type of PINCH_GESTURES) {
      document.removeEventListener(type, cancel)
    }
  }
}

export function applyAppChrome() {
  lockPinchZoom()
  if (isStandalone()) {
    document.documentElement.classList.add('is-standalone')
  }
}
