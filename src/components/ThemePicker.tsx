import { Check } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { THEMES } from '../themes/themes'
import PalMark from './brand/PalMark'

/**
 * `compact` fits three seasons across a phone without dominating the page;
 * the full variant adds the blurb and is used where there is room to explain,
 * like onboarding.
 */
export default function ThemePicker({
  compact = false,
  heading = 'Season',
}: {
  compact?: boolean
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
      <div className={compact ? 'grid grid-cols-3 gap-2' : 'grid gap-2'}>
        {THEMES.map((theme) => {
          const selected = theme.id === active.id
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={selected}
              onClick={() => void chooseTheme(theme.id, user?.id ?? '')}
              className={`rounded-2xl border transition-colors ${
                compact
                  ? 'flex flex-col items-center gap-1.5 p-2.5'
                  : 'flex items-center gap-3 p-3 text-left'
              } ${
                selected
                  ? 'border-accent bg-accent/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                // Preview each season in its own colours, not the active one's.
                style={{
                  background: `rgb(${theme.colors.surface})`,
                  border: `1px solid rgb(${theme.colors.line})`,
                }}
              >
                <PalMark size={34} costume={theme.costume} />
              </span>

              <span className={compact ? 'min-w-0' : 'min-w-0 flex-1'}>
                <span
                  className={`flex items-center gap-1 ${compact ? 'justify-center' : ''}`}
                >
                  <span className="truncate text-xs font-semibold text-gray-100 sm:text-sm">
                    {theme.name}
                  </span>
                  {selected && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                  )}
                </span>
                {!compact && (
                  <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                    {theme.blurb}
                  </span>
                )}
              </span>

              {!compact && (
                <span className="flex shrink-0 gap-1" aria-hidden="true">
                  {['accent', 'butter-400', 'surface-strong'].map((token) => (
                    <span
                      key={token}
                      className="h-6 w-2.5 rounded-full"
                      style={{ background: `rgb(${theme.colors[token]})` }}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
