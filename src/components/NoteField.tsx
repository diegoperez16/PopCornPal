import { useState } from 'react'
import { PenLine } from 'lucide-react'
import NoteComposer from './NoteComposer'

/**
 * The way into writing: a tappable preview of what you have written, which
 * opens the full-screen composer. It is a button rather than a textarea so a
 * tap always lands in the roomy surface instead of a cramped one.
 */
export default function NoteField({
  id,
  label,
  title,
  subtitle,
  value,
  placeholder = 'Write about it…',
  onChange,
  disabled = false,
}: {
  id?: string
  label: string
  /** The thing being written about, shown in the composer's header. */
  title: string
  subtitle?: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [writing, setWriting] = useState(false)
  const written = value.trim()

  return (
    <div>
      <label htmlFor={id} className="auth-label">
        {label}{' '}
        <span className="text-xs font-normal text-gray-400">· optional</span>
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setWriting(true)}
        aria-label={written ? `Edit your notes: ${written}` : 'Write notes'}
        className="flex w-full items-start gap-3 rounded-xl border border-line-soft bg-surface-sunken p-3.5 text-left transition-colors hover:border-line-strong disabled:opacity-50"
      >
        <PenLine
          size={17}
          className="mt-0.5 shrink-0 text-muted"
          aria-hidden="true"
        />
        <span
          className={`min-w-0 flex-1 text-sm leading-relaxed ${
            written ? 'text-gray-200' : 'text-gray-500'
          }`}
        >
          {written ? (
            <span className="line-clamp-3 whitespace-pre-wrap">{written}</span>
          ) : (
            placeholder
          )}
        </span>
      </button>

      {writing && (
        <NoteComposer
          title={title}
          subtitle={subtitle}
          value={value}
          placeholder={placeholder}
          onKeep={onChange}
          onClose={() => setWriting(false)}
        />
      )}
    </div>
  )
}
