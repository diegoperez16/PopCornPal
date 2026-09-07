import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(listener => listener())
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
// Capture this once at app load. The browser can fire before the install sheet mounts.
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event as BeforeInstallPromptEvent; emit() })
window.addEventListener('appinstalled', () => { installed = true; deferredPrompt = null; emit() })

export function useInstallPrompt() {
  const prompt = useSyncExternalStore(subscribe, () => deferredPrompt, () => null)
  const isInstalled = useSyncExternalStore(subscribe, () => installed, () => false)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

  const promptInstall = async () => {
    const event = deferredPrompt
    if (!event) return false
    // Each browser event may be used once, even after dismissal.
    deferredPrompt = null; emit()
    await event.prompt()
    const accepted = (await event.userChoice).outcome === 'accepted'
    if (accepted) { installed = true; emit() }
    return accepted
  }
  return { canPromptInstall: !!prompt, isIOS, isInstalled: isInstalled || isInStandaloneMode, isInStandaloneMode, promptInstall }
}
