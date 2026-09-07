import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'

/**
 * A full-screen surface for writing.
 *
 * Writing a paragraph inside a four-line box wedged between a rating control
 * and a save button is miserable on a phone: you cannot see what you have
 * written, and the keyboard leaves almost nothing visible. This gives writing
 * the whole screen, at a size meant for reading back, so it invites the long
 * note instead of discouraging it.
 *
 * The draft is local until it is kept, so backing out cannot destroy what was
 * already saved.
 */
export default function NoteComposer({
  title,
  subtitle,
  value,
  placeholder,
  onKeep,
  onClose,
}: {
  /** What is being written about, shown so the context is never lost. */
  title: string
  subtitle?: string
  value: string
  placeholder?: string
  onKeep: (value: string) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    // Focus after the dialog is actually on screen, or the keyboard opens
    // against a field that has not been laid out yet.
    const focus = requestAnimationFrame(() => {
      const input = field.current
      if (!input) return
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    })
    return () => {
      cancelAnimationFrame(focus)
      element?.close()
    }
  }, [])

  const keep = () => {
    onKeep(draft)
    onClose()
  }

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0

  return (
    <dialog
      ref={dialog}
      aria-label={`Notes on ${title}`}
      className="note-composer"
      onCancel={(event) => {
        event.preventDefault()
        keep()
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-line-soft px-3 py-2">
          <button
            type="button"
            onClick={keep}
            aria-label="Back, keeping what you wrote"
            className="app-icon-button shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-100">
              {title}
            </p>
            {subtitle && (
              <p className="truncate text-xs text-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={keep}
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-bold text-accent-on"
          >
            <Check size={16} />
            Done
          </button>
        </header>

        <textarea
          ref={field}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          maxLength={10000}
          // Roomy line height and generous type: this is for reading back what
          // you wrote, not for squeezing text into a control.
          className="min-h-0 flex-1 resize-none bg-transparent px-5 py-4 text-[17px] leading-[1.75] text-gray-100 outline-none placeholder:text-gray-600"
        />

        <footer className="flex shrink-0 items-center justify-between border-t border-line-soft px-5 py-2 pb-[max(10px,env(safe-area-inset-bottom))] text-xs text-gray-600">
          <span>{words === 1 ? '1 word' : `${words} words`}</span>
          <span>Saved when you tap Done</span>
        </footer>
      </div>
    </dialog>
  )
}
