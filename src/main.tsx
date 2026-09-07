import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyAppChrome } from './lib/appDisplay'
import { useThemeStore } from './store/themeStore'

applyAppChrome()
useThemeStore.getState().hydrateFromCache()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
