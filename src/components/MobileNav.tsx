import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { History } from 'lucide-react'
import { prefetchRouteModule } from '../lib/routeLoaders'
import { navigation } from '../app/navigation'
import PalMark from './brand/PalMark'

// Wheel slots run clockwise from the top: Log crowns the wheel, Home sits at
// the bottom nearest the thumb, social lives on the right, personal on the
// left.
const destinations = [
  navigation[2], // Log — top
  navigation[1], // People — upper right
  { path: '/activity', Icon: History, label: 'Activity' }, // lower right
  navigation[0], // Home — bottom
  navigation[3], // Library — lower left
  navigation[4], // You — upper left
]

// Weapon-wheel geometry, all in the SVG's 360×360 coordinate space.
const C = 180
const INNER = 68
const OUTER = 166
const GAP_DEG = 2.5

// Joystick selection: the pointer picks a sector once it leaves the dead zone
// around the wheel center; releasing inside it just closes the wheel.
const CENTER_DEAD_ZONE = 58
const SLIDE_THRESHOLD = 20

function polar(radius: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180
  return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)] as const
}

function sectorPath(index: number) {
  const mid = index * 60 - 90
  const start = mid - 30 + GAP_DEG
  const end = mid + 30 - GAP_DEG
  const [x1, y1] = polar(OUTER, start)
  const [x2, y2] = polar(OUTER, end)
  const [x3, y3] = polar(INNER, end)
  const [x4, y4] = polar(INNER, start)
  return `M ${x1} ${y1} A ${OUTER} ${OUTER} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${INNER} ${INNER} 0 0 0 ${x4} ${y4} Z`
}

function slotAt(clientX: number, clientY: number) {
  const dx = clientX - window.innerWidth / 2
  const dy = clientY - window.innerHeight / 2
  if (Math.hypot(dx, dy) < CENTER_DEAD_ZONE) return null
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI
  return ((Math.round((degrees + 90) / 60) % 6) + 6) % 6
}

export default function MobileNav() {
  const dialog = useRef<HTMLDialogElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const gesture = useRef<{
    pointerId: number
    startX: number
    startY: number
    moved: boolean
    detach: () => void
  } | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const close = () => dialog.current?.close()

  const open = () => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }

  const go = (path: string) => {
    navigate(path)
    close()
  }

  const endGesture = () => {
    gesture.current?.detach()
    gesture.current = null
    setHoverIndex(null)
  }

  // The drag is tracked on window rather than on the launcher or the dialog:
  // opening the wheel mid-press makes the launcher inert and hands hit-testing
  // to the modal, so element-scoped listeners drop the rest of the gesture on
  // real touch devices.
  const beginGesture = (event: React.PointerEvent) => {
    gesture.current?.detach()

    const onMove = (moveEvent: PointerEvent) => {
      const active = gesture.current
      if (!active || active.pointerId !== moveEvent.pointerId) return
      if (
        Math.hypot(
          moveEvent.clientX - active.startX,
          moveEvent.clientY - active.startY
        ) > SLIDE_THRESHOLD
      ) {
        active.moved = true
      }
      setHoverIndex(
        active.moved ? slotAt(moveEvent.clientX, moveEvent.clientY) : null
      )
    }

    const onUp = (upEvent: PointerEvent) => {
      const active = gesture.current
      if (!active || active.pointerId !== upEvent.pointerId) return
      const slid = active.moved
      endGesture()
      if (!slid) return // plain tap: leave the wheel open
      const slot = slotAt(upEvent.clientX, upEvent.clientY)
      if (slot !== null) navigate(destinations[slot].path)
      close()
    }

    const onCancel = (cancelEvent: PointerEvent) => {
      if (gesture.current?.pointerId === cancelEvent.pointerId) endGesture()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)

    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      detach: () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
      },
    }
  }

  useEffect(() => () => gesture.current?.detach(), [])

  const aimedLabel =
    hoverIndex !== null ? destinations[hoverIndex].label : null

  return (
    <div className="mobile-nav md:hidden">
      <button
        ref={launcher}
        onClick={open}
        onPointerDown={(event) => {
          // Opening mid-press makes the launcher inert; without this the
          // browser's default mousedown focus falls to body and keyboard
          // navigation inside the dialog breaks.
          event.preventDefault()
          open()
          beginGesture(event)
        }}
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
        onClose={() => {
          endGesture()
          launcher.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        onKeyDown={(event) => {
          const items = Array.from(
            dialog.current?.querySelectorAll<SVGAElement>('a') ?? []
          )
          const current = items.indexOf(
            document.activeElement as unknown as SVGAElement
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
        <nav className="radial-wheel" aria-label="Main navigation">
          <svg
            viewBox="0 0 360 360"
            className="wheel-svg"
            style={{ pointerEvents: 'none' }}
          >
            {destinations.map(({ path, Icon, label }, index) => {
              const active = location.pathname === path
              const hovered = hoverIndex === index
              const [ix, iy] = polar(122, index * 60 - 90)
              const name = label === 'Log' ? 'Log a title' : label
              return (
                <a
                  key={path}
                  href={path}
                  tabIndex={0}
                  aria-label={name}
                  aria-current={active ? 'page' : undefined}
                  style={{ pointerEvents: 'auto' }}
                  className={`wheel-sector ${path === '/add' ? 'wheel-log' : ''} ${active ? 'is-active' : ''} ${hovered ? 'is-hovered' : ''}`}
                  onClick={(event) => {
                    event.preventDefault()
                    go(path)
                  }}
                  onFocus={() => {
                    void prefetchRouteModule(path)
                  }}
                  onPointerEnter={() => {
                    void prefetchRouteModule(path)
                  }}
                >
                  <path d={sectorPath(index)} />
                  <Icon
                    size={24}
                    strokeWidth={1.7}
                    x={ix - 12}
                    y={iy - 22}
                    aria-hidden="true"
                  />
                  <text x={ix} y={iy + 20} textAnchor="middle">
                    {label}
                  </text>
                </a>
              )
            })}
            {/* Joystick hub: shows what you're aiming at. */}
            <circle
              className="wheel-hub"
              cx={C}
              cy={C}
              r={INNER - 12}
              style={{ pointerEvents: 'auto' }}
              onClick={close}
            />
            <text
              className={`wheel-hub-label ${aimedLabel ? 'is-aiming' : ''}`}
              x={C}
              y={C + 6}
              textAnchor="middle"
            >
              {aimedLabel ?? 'Where to?'}
            </text>
          </svg>
        </nav>
        <p className="radial-caption">Slide &amp; release, or tap</p>
      </dialog>
    </div>
  )
}
