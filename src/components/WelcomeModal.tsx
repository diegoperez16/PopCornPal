import { useState, useEffect } from 'react'
import { X, Download, Bell, BellOff, Wifi, Zap, Share, Plus, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import {
  canUsePushNotifications,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
} from '../lib/push'

const WELCOME_VERSION = '3'

export function shouldShowWelcome(): boolean {
  return localStorage.getItem('popcorn_welcome_v') !== WELCOME_VERSION
}

export function dismissWelcome(): void {
  localStorage.setItem('popcorn_welcome_v', WELCOME_VERSION)
}

interface WelcomeModalProps {
  userId: string
  onClose: () => void
}

type Step = 'welcome' | 'install' | 'notifications'
const STEPS: Step[] = ['welcome', 'install', 'notifications']

export default function WelcomeModal({ userId, onClose }: WelcomeModalProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  const { canPromptInstall, isIOS, isInstalled, isInStandaloneMode, promptInstall } = useInstallPrompt()

  useEffect(() => {
    getNotificationPermission().then(setNotifPermission)
    isSubscribedToPush().then(setSubscribed)
  }, [])

  const stepIndex = STEPS.indexOf(step)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  const goNext = () => {
    if (isLast) { dismissWelcome(); onClose() }
    else setStep(STEPS[stepIndex + 1])
  }
  const goPrev = () => { if (!isFirst) setStep(STEPS[stepIndex - 1]) }

  const handleClose = () => { dismissWelcome(); onClose() }

  const handleSubscribe = async () => {
    if (!canUsePushNotifications()) return
    setSubscribing(true)
    const ok = await subscribeToPush(userId)
    if (ok) {
      setSubscribed(true)
      setNotifPermission('granted')
    } else {
      const perm = await getNotificationPermission()
      setNotifPermission(perm)
    }
    setSubscribing(false)
  }

  const handleUnsubscribe = async () => {
    setSubscribing(true)
    await unsubscribeFromPush(userId)
    setSubscribed(false)
    setSubscribing(false)
  }

  const alreadyInstalled = isInstalled || isInStandaloneMode

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Sheet — full-screen on mobile, centered card on desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[501] pointer-events-none">
        <div className="pointer-events-auto w-full md:max-w-lg md:mx-4 bg-gray-900 border-t md:border border-gray-700/80 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-300">

          {/* Handle (mobile only) */}
          <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button onClick={goPrev} className="p-1.5 rounded-full text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {/* Step dots */}
              <div className="flex gap-1.5">
                {STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`rounded-full transition-all duration-300 ${
                      i === stepIndex ? 'w-5 h-2 bg-red-500' : 'w-2 h-2 bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {step === 'welcome' && <WelcomeStep />}
            {step === 'install' && (
              <InstallStep
                isIOS={isIOS}
                alreadyInstalled={alreadyInstalled}
                canPromptInstall={canPromptInstall}
                onInstall={promptInstall}
              />
            )}
            {step === 'notifications' && (
              <NotificationsStep
                permission={notifPermission}
                subscribed={subscribed}
                subscribing={subscribing}
                canUse={canUsePushNotifications()}
                onSubscribe={handleSubscribe}
                onUnsubscribe={handleUnsubscribe}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 pb-6 pt-2">
            <button
              onClick={goNext}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
            >
              {isLast ? (
                <>
                  <Check className="w-4 h-4" />
                  Got it!
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

// ─── STEP COMPONENTS ──────────────────────────────────────────────────────

function WelcomeStep() {
  const features = [
    {
      icon: <Wifi className="w-5 h-5 text-blue-400" />,
      bg: 'bg-blue-500/10 border-blue-500/20',
      title: 'Offline-ready',
      desc: 'Browse your feed and library even without a connection.',
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      title: 'Instant loading',
      desc: 'Smart caching keeps the app snappy every time you open it.',
    },
    {
      icon: <Bell className="w-5 h-5 text-red-400" />,
      bg: 'bg-red-500/10 border-red-500/20',
      title: 'Push notifications',
      desc: 'Get notified when someone likes, comments, or follows you.',
    },
    {
      icon: <Download className="w-5 h-5 text-green-400" />,
      bg: 'bg-green-500/10 border-green-500/20',
      title: 'Install as an app',
      desc: 'Add PopcornPal to your home screen for the native experience.',
    },
  ]

  return (
    <div className="py-4">
      <div className="text-4xl mb-4">🍿</div>
      <h2 className="text-2xl font-black text-white mb-2">Welcome to PopcornPal</h2>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
        PopcornPal is now a full PWA. Here's what's new and how to get the most out of it.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {features.map((f) => (
          <div key={f.title} className={`flex items-start gap-3 p-4 rounded-2xl border ${f.bg}`}>
            <div className="flex-shrink-0 mt-0.5">{f.icon}</div>
            <div>
              <p className="font-semibold text-white text-sm">{f.title}</p>
              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface InstallStepProps {
  isIOS: boolean
  alreadyInstalled: boolean
  canPromptInstall: boolean
  onInstall: () => Promise<boolean>
}

function InstallStep({ isIOS, alreadyInstalled, canPromptInstall, onInstall }: InstallStepProps) {
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(alreadyInstalled)

  const handleInstall = async () => {
    setInstalling(true)
    const ok = await onInstall()
    if (ok) setInstalled(true)
    setInstalling(false)
  }

  if (installed) {
    return (
      <div className="py-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900/30">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">You're all set!</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          PopcornPal is installed on your device. Open it from your home screen for the full native experience.
        </p>
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg shadow-red-900/30">
        <Download className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Install the App</h2>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
        Get the full app experience — faster launch, offline access, and it looks great on your home screen.
      </p>

      {isIOS ? (
        /* iOS instructions */
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">How to install on iPhone / iPad</p>
          {[
            { icon: <Share className="w-5 h-5 text-blue-400 flex-shrink-0" />, text: 'Tap the Share button in Safari (the box with an arrow pointing up)' },
            { icon: <Plus className="w-5 h-5 text-blue-400 flex-shrink-0" />, text: 'Scroll down and tap "Add to Home Screen"' },
            { icon: <Check className="w-5 h-5 text-green-400 flex-shrink-0" />, text: 'Tap "Add" — done! Find PopcornPal on your home screen.' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-800/60 rounded-2xl border border-gray-700/50">
              <div className="mt-0.5">{step.icon}</div>
              <p className="text-sm text-gray-300 leading-relaxed">{step.text}</p>
            </div>
          ))}
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-yellow-400 leading-relaxed">
              <span className="font-bold">Tip:</span> Push notifications on iOS require the app to be installed and opened from the home screen at least once.
            </p>
          </div>
        </div>
      ) : canPromptInstall ? (
        /* Android/Chrome install prompt */
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/60 rounded-2xl border border-gray-700/50">
            <p className="text-sm text-gray-300 leading-relaxed">
              Install PopcornPal as a standalone app. It'll work offline and launch instantly from your home screen.
            </p>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {installing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Install App
          </button>
        </div>
      ) : (
        /* Already installed or no prompt available */
        <div className="p-4 bg-gray-800/60 rounded-2xl border border-gray-700/50">
          <p className="text-sm text-gray-400 leading-relaxed">
            You can install PopcornPal from your browser's menu — look for "Add to Home Screen" or "Install App" in your browser options.
          </p>
        </div>
      )}
    </div>
  )
}

interface NotificationsStepProps {
  permission: NotificationPermission
  subscribed: boolean
  subscribing: boolean
  canUse: boolean
  onSubscribe: () => void
  onUnsubscribe: () => void
}

function NotificationsStep({ permission, subscribed, subscribing, canUse, onSubscribe, onUnsubscribe }: NotificationsStepProps) {
  const notifTypes = [
    { emoji: '❤️', label: 'Likes', desc: 'When someone likes your post' },
    { emoji: '💬', label: 'Comments', desc: 'When someone comments on your post' },
    { emoji: '↩️', label: 'Replies', desc: 'When someone replies to your comment' },
    { emoji: '👥', label: 'Follows', desc: 'When someone starts following you' },
  ]

  return (
    <div className="py-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-4 shadow-lg shadow-purple-900/30">
        <Bell className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Stay in the loop</h2>
      <p className="text-gray-400 text-sm mb-5 leading-relaxed">
        Get notified when people interact with your posts, even when the app is closed.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {notifTypes.map(n => (
          <div key={n.label} className="flex items-center gap-2 p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
            <span className="text-lg">{n.emoji}</span>
            <div>
              <p className="text-xs font-semibold text-white">{n.label}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{n.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {!canUse ? (
        <div className="p-4 bg-gray-800/60 rounded-2xl border border-gray-700/50">
          <p className="text-sm text-gray-400 leading-relaxed">
            Push notifications aren't available in your current browser. Install the app and open it from your home screen for notification support.
          </p>
        </div>
      ) : permission === 'denied' ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <BellOff className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Notifications blocked</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                You've blocked notifications for this site. To enable them, go to your browser settings and allow notifications for PopcornPal.
              </p>
            </div>
          </div>
        </div>
      ) : subscribed ? (
        <div className="space-y-3">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-400 font-semibold">Notifications are enabled!</p>
          </div>
          <button
            onClick={onUnsubscribe}
            disabled={subscribing}
            className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {subscribing
              ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <BellOff className="w-4 h-4" />
            }
            Turn off notifications
          </button>
        </div>
      ) : (
        <button
          onClick={onSubscribe}
          disabled={subscribing}
          className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-900/30"
        >
          {subscribing
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Bell className="w-4 h-4" />
          }
          Enable Notifications
        </button>
      )}
    </div>
  )
}
