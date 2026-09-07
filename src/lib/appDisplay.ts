// Zoom stays available in a browser tab, where pinch-zoom is the user's only
// way to enlarge text and removing it would fail WCAG 1.4.4. Once the app is
// installed to the home screen the browser's own zoom and text controls are
// gone and accidental pinch/double-tap scaling just breaks the layout, so the
// installed app locks scale the way a native one does.
const STANDALONE_VIEWPORT = [
  'width=device-width',
  'initial-scale=1.0',
  'viewport-fit=cover',
  'interactive-widget=resizes-content',
  'user-scalable=no',
  'maximum-scale=1',
].join(', ')

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    // iOS Safari predates display-mode and exposes its own flag.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function applyStandaloneChrome() {
  if (!isStandalone()) return
  document.documentElement.classList.add('is-standalone')
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', STANDALONE_VIEWPORT)
}
