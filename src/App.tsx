import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import { isSupabaseConfigured } from './lib/supabase'
import SplashLoader from './components/SplashLoader'
import Brand from './components/brand/Brand'
import AppShell from './app/AppShell'
import { useAppLifecycle } from './app/useAppLifecycle'

export default function App() {
  const ready = useAppLifecycle()

  if (!isSupabaseConfigured)
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="app-panel rounded-3xl p-8 max-w-md">
          <Brand />
          <h1 className="text-2xl font-semibold mt-8 mb-3">
            Let’s get connected.
          </h1>
          <p className="app-muted">
            This installation needs its Supabase connection before you can sign
            in. Add your project settings from the setup guide and restart the
            app.
          </p>
        </div>
      </main>
    )
  if (!ready) return <SplashLoader />

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
