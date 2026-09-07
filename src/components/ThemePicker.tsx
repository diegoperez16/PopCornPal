import { Check } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { THEMES } from '../themes/themes'
import PalMark from './brand/PalMark'

export default function ThemePicker() {
  const user = useAuthStore((state) => state.user)
  const active = useThemeStore((state) => state.theme)
  const chooseTheme = useThemeStore((state) => state.chooseTheme)

  return (
    <section aria-labelledby="theme-picker-heading" className="mb-8">
      <h3
        id="theme-picker-heading"
        className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3"
      >
        Season
      </h3>
      <div className="grid gap-2 sm:grid-cols-3">
        {THEMES.map((theme) => {
          const selected = theme.id === active.id
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={selected}
              onClick={() => void chooseTheme(theme.id, user?.id ?? '')}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
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
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-100">
                    {theme.name}
                  </span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                  {theme.blurb}
                </span>
              </span>
              <span className="flex shrink-0 gap-1" aria-hidden="true">
                {['accent', 'butter-400', 'surface-strong'].map((token) => (
                  <span
                    key={token}
                    className="h-6 w-2.5 rounded-full"
                    style={{ background: `rgb(${theme.colors[token]})` }}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
