import { useState, useEffect } from 'react'
import {
  X, Download, Bell, BellOff, Wifi, Zap, Share2, Plus, Check,
  ChevronRight, ChevronLeft, Smartphone, Film, Heart, MessageCircle,
  Users, CornerDownLeft, ExternalLink,
} from 'lucide-react'
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
  try { return localStorage.getItem('popcorn_welcome_v') !== WELCOME_VERSION } catch { return false }
}

export function dismissWelcome(): void {
  try { localStorage.setItem('popcorn_welcome_v', WELCOME_VERSION) } catch { /* Onboarding is optional. */ }
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
      setNotifPermission(await getNotificationPermission())
    }
    setSubscribing(false)
  }

  const handleUnsubscribe = async () => {
    setSubscribing(true)
    await unsubscribeFromPush(userId)
    setSubscribed(false)
    setSubscribing(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Sheet — full-screen on mobile, centered card on desktop */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[501] pointer-events-none">
        <div className="pointer-events-auto w-full md:max-w-lg md:mx-4 bg-gray-900 border-t md:border border-gray-700/80 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-300">

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
            <button onClick={handleClose} className="p-2 rounded-full text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {step === 'welcome' && <WelcomeStep />}
            {step === 'install' && (
              <InstallStep
                isIOS={isIOS}
                alreadyInstalled={isInstalled || isInStandaloneMode}
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
              className="w-full py-3.5 rounded-2xl bg-[#ff655b] hover:bg-[#ff8175] text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
            >
              {isLast ? (
                <><Check className="w-4 h-4" /> Got it!</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

// ─── STEP 1: WELCOME ──────────────────────────────────────────────────────

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
      icon: <Smartphone className="w-5 h-5 text-green-400" />,
      bg: 'bg-green-500/10 border-green-500/20',
      title: 'Install as an app',
      desc: 'Add PopcornPal to your home screen for the full native experience.',
    },
  ]

  return (
    <div className="py-4">
      <div className="w-14 h-14 rounded-2xl bg-[#2c3440] flex items-center justify-center mb-4 shadow-lg shadow-red-900/30">
        <Film className="w-7 h-7 text-white" />
      </div>
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

// ─── STEP 2: INSTALL ──────────────────────────────────────────────────────

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
        <h2 className="text-2xl font-black text-white mb-2">App installed!</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          PopcornPal is on your home screen. Open it from there for the full native experience — faster launch, offline support, and no browser UI.
        </p>
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-900/30">
        <Smartphone className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-2xl font-black text-white mb-1">Add to Home Screen</h2>
      <p className="text-gray-400 text-sm mb-2 leading-relaxed">
        "Install the app" just means adding PopcornPal to your home screen — no App Store needed. It opens full-screen like a native app and works offline.
      </p>

      {/* Why bother callout */}
      <div className="flex items-start gap-2.5 p-3 bg-gray-800/60 rounded-xl border border-gray-700/50 mb-5">
        <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300 leading-relaxed">
          Push notifications on iOS <span className="text-white font-semibold">require</span> the app to be on your home screen. Install now to unlock them.
        </p>
      </div>

      {isIOS ? (
        /* iOS instructions */
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">How to install on iPhone / iPad</p>

          {[
            {
              icon: <Share2 className="w-5 h-5 text-blue-400 flex-shrink-0" />,
              step: '1',
              text: 'Tap the Share button in Safari',
              sub: 'The box with an arrow pointing up at the bottom of the screen',
            },
            {
              icon: <Plus className="w-5 h-5 text-blue-400 flex-shrink-0" />,
              step: '2',
              text: 'Tap "Add to Home Screen"',
              sub: 'Scroll down in the share sheet to find it',
            },
            {
              icon: <Check className="w-5 h-5 text-green-400 flex-shrink-0" />,
              step: '3',
              text: 'Tap "Add" — done!',
              sub: 'PopcornPal will appear on your home screen like any other app',
            },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3 p-3.5 bg-gray-800/60 rounded-2xl border border-gray-700/50">
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-400">
                {s.step}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {s.icon}
                  <p className="text-sm font-semibold text-white">{s.text}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.sub}</p>
              </div>
            </div>
          ))}

          <div className="mt-3 p-3 bg-gray-800/40 rounded-xl border border-gray-700/30 flex items-center gap-2.5">
            <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Must be using <span className="text-white">Safari</span> — Chrome and Firefox on iOS don't support Add to Home Screen.
            </p>
          </div>
        </div>
      ) : canPromptInstall ? (
        /* Android / Chrome — one-tap install */
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/60 rounded-2xl border border-gray-700/50">
            <p className="text-sm text-gray-300 leading-relaxed">
              Your browser supports one-tap install. Tap the button below and PopcornPal will be added to your home screen automatically.
            </p>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {installing
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Download className="w-4 h-4" />
            }
            Add to Home Screen
          </button>
        </div>
      ) : (
        /* Already installed or no prompt */
        <div className="p-4 bg-gray-800/60 rounded-2xl border border-gray-700/50">
          <p className="text-sm text-gray-400 leading-relaxed">
            Look for <span className="text-white font-medium">"Add to Home Screen"</span> or <span className="text-white font-medium">"Install App"</span> in your browser's menu (usually the three-dot menu at the top right).
          </p>
        </div>
      )}
    </div>
  )
}

// ─── STEP 3: NOTIFICATIONS ────────────────────────────────────────────────

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
    { icon: <Heart className="w-4 h-4 text-red-400" />,           label: 'Likes',    desc: 'When someone likes your post' },
    { icon: <MessageCircle className="w-4 h-4 text-blue-400" />,  label: 'Comments', desc: 'When someone comments on your post' },
    { icon: <CornerDownLeft className="w-4 h-4 text-purple-400" />, label: 'Replies', desc: 'When someone replies to your comment' },
    { icon: <Users className="w-4 h-4 text-green-400" />,          label: 'Follows',  desc: 'When someone follows you' },
  ]

  return (
    <div className="py-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mb-4 shadow-lg shadow-purple-900/30">
        <Bell className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Stay in the loop</h2>
      <p className="text-gray-400 text-sm mb-5 leading-relaxed">
        Get notified when people interact with your posts, even when the app is closed.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {notifTypes.map(n => (
          <div key={n.label} className="flex items-center gap-2 p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
            <div className="flex-shrink-0">{n.icon}</div>
            <div>
              <p className="text-xs font-semibold text-white">{n.label}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{n.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {!canUse ? (
        <div className="p-4 bg-gray-800/60 rounded-2xl border border-gray-700/50">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Push notifications require the app to be installed. Go back to the previous step to add it to your home screen first.
            </p>
          </div>
        </div>
      ) : permission === 'denied' ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <BellOff className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Notifications blocked</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                You've blocked notifications for this site. To re-enable, go to your browser or phone Settings and allow notifications for PopcornPal.
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
