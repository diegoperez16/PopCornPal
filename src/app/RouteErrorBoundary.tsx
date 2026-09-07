import { Component, type ReactNode } from 'react'

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    error.message.includes('dynamically imported module') ||
    error.message.includes('Importing a module script failed') ||
    error.name === 'ChunkLoadError'
  )
}

// Guard against infinite reload loops: only reload once per 10s window
function reloadForChunkError() {
  const key = 'chunk_reload_at'
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0)
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(key, String(Date.now()))
      window.location.reload()
    }
  } catch {
    /* Render the retry screen if session storage is unavailable. */
  }
}

// Catches failed lazy chunk loads (e.g. after a new deploy invalidates cached JS URLs)
// and forces a full page reload so the browser fetches fresh chunks.
export default class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      reloadForChunkError()
    } else {
      console.error('App error:', error)
    }
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-center p-8">
          <div>
            <p className="text-lg font-semibold mb-2">Something went wrong</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Catch chunk load errors that fire as unhandled promise rejections
// (lazy imports fail before React's render cycle, so componentDidCatch won't see them)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault()
      reloadForChunkError()
    }
  })
}
