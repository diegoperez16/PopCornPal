import { useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { History, X } from 'lucide-react'
import { prefetchRouteModule } from '../lib/routeLoaders'
import { navigation } from '../app/navigation'
import PalMark from './brand/PalMark'

const destinations = [
  navigation[2],
  navigation[0],
  navigation[1],
  navigation[4],
  navigation[3],
  { path: '/activity', Icon: History, label: 'Activity' },
]

export default function MobileNav() {
  const dialog = useRef<HTMLDialogElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const close = () => dialog.current?.close()
  const currentLabel =
    destinations.find((item) => item.path === location.pathname)?.label ??
    'Explore'

  return (
    <div className="mobile-nav md:hidden">
      <button
        ref={launcher}
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        aria-label="Open navigation"
        className="radial-launcher"
        title="Open navigation"
      >
        <PalMark size={40} />
      </button>
      <dialog
        ref={dialog}
        className="radial-dialog"
        aria-label="Popcorn Pal navigation"
        onClose={() => launcher.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        onKeyDown={(event) => {
          const items = Array.from(
            dialog.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []
          )
          const current = items.indexOf(
            document.activeElement as HTMLAnchorElement
          )
          if (
            [
              'ArrowRight',
              'ArrowDown',
              'ArrowLeft',
              'ArrowUp',
              'Home',
              'End',
            ].includes(event.key)
          ) {
            event.preventDefault()
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : (current +
                      (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) +
                      items.length) %
                    items.length
            items[next]?.focus()
          }
        }}
      >
        <div className="radial-heading">
          <p className="app-kicker">Your next scene</p>
          <h2>Where to?</h2>
        </div>
        <nav className="radial-wheel" aria-label="Main navigation">
          <div className="radial-orbit" aria-hidden="true" />
          {destinations.map(({ path, Icon, label }, index) => {
            const angle = ((index * 60 - 90) * Math.PI) / 180
            const active = location.pathname === path
            return (
              <Link
                to={path}
                key={path}
                onClick={close}
                aria-current={active ? 'page' : undefined}
                className={`radial-destination ${path === '/add' ? 'radial-log' : ''} ${active ? 'is-active' : ''}`}
                style={{
                  left: `calc(50% + ${Math.cos(angle) * 113}px)`,
                  top: `calc(50% + ${Math.sin(angle) * 113}px)`,
                }}
                onFocus={() => {
                  void prefetchRouteModule(path)
                }}
                onPointerEnter={() => {
                  void prefetchRouteModule(path)
                }}
              >
                <Icon size={24} strokeWidth={1.7} />
                <span>{label === 'Log' ? 'Log a title' : label}</span>
              </Link>
            )
          })}
          <button
            className="radial-close"
            aria-label="Close navigation"
            onClick={close}
            autoFocus
          >
            <X size={23} />
            <span>Close</span>
          </button>
        </nav>
        <p className="radial-caption">Now showing · {currentLabel}</p>
      </dialog>
    </div>
  )
}
