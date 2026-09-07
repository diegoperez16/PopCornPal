import { Check } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { THEMES } from '../themes/themes'
import PalMark from './brand/PalMark'

/**
 * Seasons live on a strip of film rather than in a row of cards.
 *
 * A row of rounded rectangles is the same control every app ships, and it told
 * you nothing about what this app is. A filmstrip is native to it: each season
 * is a frame, painted in its own palette with Poppy in costume, and the strip
 * scroll-snaps so a flick lands cleanly on one. Sprocket holes run along the
 * top and bottom edges as a repeating gradient, so the strip reads as a
 * physical object rather than a widget.
 */
export default function ThemePicker({
  heading = 'Season',
}: {
  heading?: string | null
}) {
  const user = useAuthStore((state) => state.user)
  const active = useThemeStore((state) => state.theme)
  const chooseTheme = useThemeStore((state) => state.chooseTheme)

  return (
    <section aria-label="Season">
      {heading && (
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">
          {heading}
        </h3>
      )}
      <div
        className="filmstrip no-scrollbar"
        role="radiogroup"
        aria-label="Choose a season"
      >
        {THEMES.map((theme) => {
          const selected = theme.id === active.id
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => void chooseTheme(theme.id, user?.id ?? '')}
              className={`filmstrip-frame ${selected ? 'is-selected' : ''}`}
              // Each frame is painted in the season it offers, so the strip
              // previews four palettes at once instead of describing them.
              style={{
                background: `rgb(${theme.colors.surface})`,
                borderColor: selected
                  ? `rgb(${theme.colors.accent})`
                  : `rgb(${theme.colors.line})`,
              }}
            >
              <span
                className="filmstrip-sprocket-row"
                aria-hidden="true"
                style={{ color: `rgb(${theme.colors['surface-sunken']})` }}
              />
              <PalMark size={44} costume={theme.costume} />
              <span
                className="filmstrip-name"
                style={{ color: `rgb(${theme.colors.text})` }}
              >
                {theme.name}
              </span>
              <span className="filmstrip-swatches" aria-hidden="true">
                {['accent', 'butter-400', 'text'].map((token) => (
                  <span
                    key={token}
                    style={{ background: `rgb(${theme.colors[token]})` }}
                  />
                ))}
              </span>
              {selected && (
                <span
                  className="filmstrip-check"
                  style={{
                    background: `rgb(${theme.colors.accent})`,
                    color: `rgb(${theme.colors['on-accent']})`,
                  }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-gray-600">
        {active.blurb}
      </p>
    </section>
  )
}
