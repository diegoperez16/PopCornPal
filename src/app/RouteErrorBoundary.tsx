import { Component, type ReactNode } from 'react'
import Brand from '../components/brand/Brand'

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
        <div className="flex min-h-screen items-center justify-center bg-bg p-6">
          <div className="app-empty w-full max-w-md">
            <div className="mb-4 flex justify-center">
              <Brand />
            </div>
            <h3>Something went wrong</h3>
            <p>Reload to pick up where you left off.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="app-button-primary mt-6"
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
