import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useKeyboardFit } from './useKeyboardFit'

/**
 * The one modal surface: a bottom sheet on a phone, a centred panel on a
 * desktop. Built on a native <dialog> so Escape, the backdrop, focus trapping
 * and focus restoration all come from the browser, and so the wheel launcher
 * and pull-to-refresh can tell a sheet is open (both look for dialog[open]).
 *
 * Render it conditionally; mounting opens it, unmounting closes it.
 */
export default function Sheet({
  title,
  header,
  ariaLabel,
  onClose,
  footer,
  size = 'default',
  closeLabel = 'Close',
  closeDisabled = false,
  dismissOnBackdrop = true,
  bodyClassName = '',
  children,
}: {
  /** Visible heading. Pass `header` instead for a richer top row. */
  title?: ReactNode
  header?: ReactNode
  /** Required when there is no `title`. */
  ariaLabel?: string
  onClose: () => void
  footer?: ReactNode
  size?: 'narrow' | 'default' | 'wide'
  closeLabel?: string
  closeDisabled?: boolean
  dismissOnBackdrop?: boolean
  bodyClassName?: string
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useKeyboardFit(dialog)
  // Whatever opened the sheet, read during the first render: by the time the
  // effect runs, React has already moved focus to any autoFocus field inside.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )

  useEffect(() => {
    const element = dialog.current
    // showModal() re-targets focus to the first control (the close button);
    // a field the caller marked autoFocus should win instead.
    const wanted =
      element && element.contains(document.activeElement)
        ? (document.activeElement as HTMLElement)
        : null
    element?.showModal()
    wanted?.focus({ preventScroll: true })
    return () => {
      element?.close()
      opener?.focus({ preventScroll: true })
    }
  }, [opener])

  return (
    <dialog
      ref={dialog}
      className={`app-sheet app-sheet-${size}`}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      onCancel={(event) => {
        event.preventDefault()
        if (!closeDisabled) onClose()
      }}
      onClick={(event) => {
        if (dismissOnBackdrop && !closeDisabled && event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div aria-hidden="true" className="app-sheet-handle md:hidden" />
        <header className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-2 md:pt-5">
          <div className="min-w-0 flex-1">
            {header ?? (
              <h2
                id={titleId}
                className="pt-2 text-lg font-semibold leading-snug tracking-tight text-gray-50"
              >
                {title}
              </h2>
            )}
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            disabled={closeDisabled}
            onClick={onClose}
            className="app-icon-button -mr-2 shrink-0"
          >
            <X size={20} />
          </button>
        </header>
        <div
          className={`sheet-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5 ${bodyClassName}`}
        >
          {children}
        </div>
        {footer && (
          <footer className="shrink-0 border-t border-line-soft bg-surface px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  )
}
