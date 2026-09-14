import { useState, type CSSProperties } from 'react'
import { Minus, Plus } from 'lucide-react'
import VerdictMark from '../features/verdict/VerdictMark'
import { verdictFor } from '../features/verdict/verdictModel'

/**
 * The rating moment, shared by every place a score is set.
 *
 * A slider you drag with a thumb, a big number you can tap to type an exact
 * score, and Poppy reacting as the number moves. The +/- nudge by a tenth
 * for the last bit of precision a thumb cannot manage. Poppy is keyed on
 * the verdict so a change of tier pops in as a reaction; sliding within a
 * tier leaves the face still.
 */
export default function RatingField({
  rating,
  onChange,
  dumpstered = false,
  onToggleDumpster,
  disabled = false,
  label = 'Your rating',
}: {
  rating: number
  onChange: (value: number) => void
  dumpstered?: boolean
  /** Omit where an entry cannot be sent to the dumpster. */
  onToggleDumpster?: () => void
  disabled?: boolean
  label?: string
}) {
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  // Zero is "not rated yet", not a score of zero, so Poppy stays quiet.
  const verdict = dumpstered || rating > 0 ? verdictFor(rating, dumpstered) : null

  const set = (value: number) =>
    onChange(Math.min(10, Math.max(0, Math.round(value * 10) / 10)))
  const commit = () => {
    const parsed = parseFloat(draft)
    if (!Number.isNaN(parsed)) set(parsed)
    setTyping(false)
  }

  return (
    <fieldset disabled={disabled}>
      <legend className="app-label">
        {label} <small>· optional</small>
      </legend>
      <div className="rounded-2xl border border-line-soft bg-surface-sunken p-4">
        {dumpstered ? (
          <div className="flex items-center gap-4">
            <VerdictMark verdict="dumpster" size={56} />
            <div>
              <p className="text-base font-semibold text-gray-50">Dumpster</p>
              <p className="text-sm text-muted">No number. You sent this one to the dumpster.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              {typing ? (
                <input
                  aria-label="Your rating out of 10"
                  inputMode="decimal"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commit}
                  onKeyDown={(event) => event.key === 'Enter' && commit()}
                  className="h-14 w-28 rounded-xl border border-butter-400 bg-surface text-center text-4xl font-bold tabular-nums text-gray-50 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  aria-label="Type a rating out of 10"
                  onClick={() => {
                    setDraft(rating > 0 ? String(rating) : '')
                    setTyping(true)
                  }}
                  className="-ml-2 flex h-14 items-baseline gap-1 rounded-xl px-2 hover:bg-surface-strong"
                >
                  <span className="text-4xl font-bold leading-none tabular-nums text-gray-50">
                    {rating > 0 ? rating.toFixed(1) : '—'}
                  </span>
                  <span className="text-sm font-semibold text-muted">/10</span>
                </button>
              )}
              <div className="flex min-h-10 items-center justify-end gap-2 text-right" aria-live="polite">
                {verdict ? (
                  <span key={verdict.id} className="verdict-pop flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-50">{verdict.name}</span>
                    <VerdictMark verdict={verdict.id} size={40} />
                  </span>
                ) : (
                  <span className="text-xs text-muted">Slide to rate</span>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                aria-label="Decrease rating"
                onClick={() => set(rating - 0.1)}
                disabled={disabled || rating <= 0}
                className="app-icon-button rounded-full border border-line-soft bg-surface-strong text-muted hover:text-gray-50"
              >
                <Minus size={18} />
              </button>
              <input
                type="range"
                className="app-slider"
                min={0}
                max={10}
                step={0.1}
                value={rating}
                aria-label="Rating out of 10"
                aria-valuetext={rating > 0 ? `${rating.toFixed(1)} out of 10` : 'Not rated'}
                onChange={(event) => set(Number(event.target.value))}
                style={{ '--pct': `${rating * 10}%` } as CSSProperties}
              />
              <button
                type="button"
                aria-label="Increase rating"
                onClick={() => set(rating + 0.1)}
                disabled={disabled || rating >= 10}
                className="app-icon-button rounded-full border border-line-soft bg-surface-strong text-muted hover:text-gray-50"
              >
                <Plus size={18} />
              </button>
            </div>
          </>
        )}

        {(onToggleDumpster || (rating > 0 && !dumpstered)) && (
          <div className="mt-2 flex items-center justify-end gap-1">
            {rating > 0 && !dumpstered && (
              <button type="button" onClick={() => onChange(0)} className="app-button-ghost app-button-sm">
                Clear
              </button>
            )}
            {onToggleDumpster && (
              <button
                type="button"
                onClick={onToggleDumpster}
                aria-pressed={dumpstered}
                className={`app-button-ghost app-button-sm ${dumpstered ? 'text-accent-bright' : ''}`}
              >
                <VerdictMark verdict="dumpster" size={18} />
                {dumpstered ? 'Give it a number instead' : 'Too bad to rate'}
              </button>
            )}
          </div>
        )}
      </div>
    </fieldset>
  )
}
