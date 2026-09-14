import { useState, useEffect } from 'react'
import {
  Download, Bell, BellOff, Wifi, Share2, Plus, Check,
  ChevronRight, ChevronLeft, Smartphone, Heart, MessageCircle,
  Users, CornerDownLeft, ExternalLink, Compass, NotebookPen, Sparkles,
} from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { WELCOME_VERSION } from '../lib/welcomeVersion'
import PalMark from './brand/PalMark'
import Sheet from './Sheet'
import ThemePicker from './ThemePicker'
import {
  canUsePushNotifications,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
} from '../lib/push'



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

type Step = 'welcome' | 'season' | 'install' | 'notifications'
const STEPS: Step[] = ['welcome', 'season', 'install', 'notifications']

const TILE = 'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line-soft bg-surface-strong'
const HEADING = 'mb-2 text-2xl font-semibold tracking-tight text-gray-50'
const BODY = 'text-sm leading-relaxed text-muted'
const SPINNER = 'h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'

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
    <Sheet
      onClose={handleClose}
      ariaLabel="Welcome to Popcorn Pal"
      header={
        <div className="flex items-center gap-2 pt-1">
          {!isFirst && (
            <button type="button" onClick={goPrev} className="app-icon-button -ml-2" aria-label="Back">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === stepIndex ? 'w-5 bg-accent' : 'w-2 bg-line-strong'
                }`}
              />
            ))}
          </div>
        </div>
      }
      footer={
        <button type="button" onClick={goNext} className="app-button-primary w-full">
          {isLast ? (
            <><Check size={16} /> Got it!</>
          ) : (
            <>Next <ChevronRight size={16} /></>
          )}
        </button>
      }
    >
      {step === 'welcome' && <WelcomeStep />}
      {step === 'season' && <SeasonStep />}
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
    </Sheet>
  )
}

// ─── STEP 1: WELCOME ──────────────────────────────────────────────────────

function WelcomeStep() {
  const features = [
    {
      icon: <Sparkles size={20} className="text-butter-300" />,
      title: 'A whole new look',
      desc: 'Meet Poppy, our popcorn pal, and a design that finally feels like ours.',
    },
    {
      icon: <Compass size={20} className="text-accent" />,
      title: 'Hold the pal to navigate',
      desc: 'Press Poppy at the bottom, slide to where you want, let go. Tapping still works.',
    },
    {
      icon: <NotebookPen size={20} className="text-butter-300" />,
      title: 'Room to write',
      desc: 'Notes grow as you type, and the keyboard no longer covers the save button.',
    },
    {
      icon: <Wifi size={20} className="text-accent" />,
      title: 'Works offline',
      desc: 'Browse your feed and library, and log things, with no connection.',
    },
  ]

  return (
    <div className="py-2">
      <div className={TILE}>
        <PalMark size={40} />
      </div>
      <h2 className={HEADING}>Popcorn Pal got a redesign</h2>
      <p className={`${BODY} mb-2`}>
        New look, a mascot, and a few things that were quietly annoying are fixed.
      </p>
      <ul className="divide-y divide-line-soft">
        {features.map((f) => (
          <li key={f.title} className="flex items-start gap-3 py-3">
            <span className="mt-0.5 shrink-0">{f.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-50">{f.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{f.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── STEP 2: SEASON ───────────────────────────────────────────────────────

function SeasonStep() {
  return (
    <div className="py-2">
      <div className={TILE}>
        <PalMark size={40} />
      </div>
      <h2 className={HEADING}>Pick your season</h2>
      <p className={`${BODY} mb-5`}>
        The app repaints itself and Poppy dresses up. It is yours alone, so
        your friends keep whichever season they picked. Change it any time from
        your profile.
      </p>
      <ThemePicker heading={null} />
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Cinema is the original look, kept exactly as it was.
      </p>
    </div>
  )
}

// ─── STEP 3: INSTALL ──────────────────────────────────────────────────────

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
      <div className="py-2">
        <div className={TILE}>
          <Smartphone size={28} className="text-accent" />
        </div>
        <h2 className={HEADING}>App installed!</h2>
        <p className={`${BODY} mb-4`}>
          PopcornPal is on your home screen. Open it from there for the full native experience — faster launch, offline support, and no browser UI.
        </p>
        <div role="status" className="app-note app-note-ok flex items-center gap-2">
          <Check size={18} className="shrink-0" />
          <span className="font-semibold">Installed and ready</span>
        </div>
      </div>
    )
  }

  const iosSteps = [
    {
      icon: <Share2 size={18} className="shrink-0 text-muted" />,
      step: '1',
      text: 'Tap the Share button in Safari',
      sub: 'The box with an arrow pointing up at the bottom of the screen',
    },
    {
      icon: <Plus size={18} className="shrink-0 text-muted" />,
      step: '2',
      text: 'Tap "Add to Home Screen"',
      sub: 'Scroll down in the share sheet to find it',
    },
    {
      icon: <Check size={18} className="shrink-0 text-ok" />,
      step: '3',
      text: 'Tap "Add" — done!',
      sub: 'PopcornPal will appear on your home screen like any other app',
    },
  ]

  return (
    <div className="py-2">
      <div className={TILE}>
        <Smartphone size={28} className="text-accent" />
      </div>
      <h2 className={HEADING}>Add to Home Screen</h2>
      <p className={`${BODY} mb-4`}>
        "Install the app" just means adding PopcornPal to your home screen — no App Store needed. It opens full-screen like a native app and works offline.
      </p>

      <div role="status" className="app-note app-note-warn mb-5 text-xs">
        Push notifications on iOS <span className="font-semibold">require</span> the app to be on your home screen. Install now to unlock them.
      </div>

      {isIOS ? (
        <div>
          <h3 className="app-h2 mb-1">How to install on iPhone / iPad</h3>
          <ul className="divide-y divide-line-soft">
            {iosSteps.map((s) => (
              <li key={s.step} className="flex items-start gap-3 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-strong text-xs font-semibold text-muted">
                  {s.step}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {s.icon}
                    <p className="text-sm font-semibold text-gray-50">{s.text}</p>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.sub}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <ExternalLink size={16} className="mt-0.5 shrink-0" />
            <span>
              Must be using <span className="font-medium text-gray-200">Safari</span> — Chrome and Firefox on iOS don't support Add to Home Screen.
            </span>
          </p>
        </div>
      ) : canPromptInstall ? (
        <div className="space-y-4">
          <p className={BODY}>
            Your browser supports one-tap install. Tap the button below and PopcornPal will be added to your home screen automatically.
          </p>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="app-button-primary w-full"
          >
            {installing ? <span className={SPINNER} aria-hidden="true" /> : <Download size={16} />}
            Add to Home Screen
          </button>
        </div>
      ) : (
        <p className={BODY}>
          Look for <span className="font-medium text-gray-200">"Add to Home Screen"</span> or <span className="font-medium text-gray-200">"Install App"</span> in your browser's menu (usually the three-dot menu at the top right).
        </p>
      )}
    </div>
  )
}

// ─── STEP 4: NOTIFICATIONS ────────────────────────────────────────────────

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
    { icon: <Heart size={16} />,           label: 'Likes',    desc: 'When someone likes your post' },
    { icon: <MessageCircle size={16} />,   label: 'Comments', desc: 'When someone comments on your post' },
    { icon: <CornerDownLeft size={16} />,  label: 'Replies',  desc: 'When someone replies to your comment' },
    { icon: <Users size={16} />,           label: 'Follows',  desc: 'When someone follows you' },
  ]

  return (
    <div className="py-2">
      <div className={TILE}>
        <Bell size={28} className="text-accent" />
      </div>
      <h2 className={HEADING}>Stay in the loop</h2>
      <p className={`${BODY} mb-5`}>
        Get notified when people interact with your posts, even when the app is closed.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {notifTypes.map(n => (
          <div key={n.label} className="flex items-start gap-2 rounded-xl border border-line-soft bg-surface-sunken p-3">
            <span className="mt-0.5 shrink-0 text-muted">{n.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-50">{n.label}</p>
              <p className="text-xs leading-snug text-muted">{n.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {!canUse ? (
        <div role="status" className="app-note app-note-warn flex items-start gap-3">
          <Smartphone size={18} className="mt-0.5 shrink-0" />
          <p>
            Push notifications require the app to be installed. Go back to the previous step to add it to your home screen first.
          </p>
        </div>
      ) : permission === 'denied' ? (
        <div role="alert" className="app-note app-note-danger flex items-start gap-3">
          <BellOff size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Notifications blocked</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              You've blocked notifications for this site. To re-enable, go to your browser or phone Settings and allow notifications for PopcornPal.
            </p>
          </div>
        </div>
      ) : subscribed ? (
        <div className="space-y-3">
          <div role="status" className="app-note app-note-ok flex items-center gap-3">
            <Check size={18} className="shrink-0" />
            <p className="font-semibold">Notifications are enabled!</p>
          </div>
          <button
            type="button"
            onClick={onUnsubscribe}
            disabled={subscribing}
            className="app-button-secondary w-full"
          >
            {subscribing ? <span className={SPINNER} aria-hidden="true" /> : <BellOff size={16} />}
            Turn off notifications
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSubscribe}
          disabled={subscribing}
          className="app-button-primary w-full"
        >
          {subscribing ? <span className={SPINNER} aria-hidden="true" /> : <Bell size={16} />}
          Enable Notifications
        </button>
      )}
    </div>
  )
}
