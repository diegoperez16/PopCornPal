import { useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

interface DecimalRatingProps {
  value: number
  onChange: (v: number) => void
}

export default function DecimalRating({ value, onChange }: DecimalRatingProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const step = (delta: number) => {
    const next = Math.round((value + delta) * 10) / 10
    onChange(Math.min(10, Math.max(0, next)))
  }

  const commitDraft = () => {
    const n = parseFloat(draft)
    if (!isNaN(n)) onChange(Math.min(10, Math.max(0, Math.round(n * 10) / 10)))
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => step(-0.1)}
        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-colors active:scale-95 flex-shrink-0"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
          className="w-16 text-center bg-transparent text-2xl font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value > 0 ? String(value) : ''); setEditing(true) }}
          className="w-16 text-center text-2xl font-bold tabular-nums"
        >
          {value > 0 ? (
            <span className="text-white">{value.toFixed(1)}</span>
          ) : (
            <span className="text-gray-700">—</span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={() => step(0.1)}
        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-colors active:scale-95 flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      <span className="text-xs text-gray-700 font-medium">/ 10</span>

      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  )
}
