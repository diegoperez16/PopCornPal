import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  Loader2,
  Minus,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import {
  useDeleteEntry,
  useUpdateEntry,
} from '../../hooks/queries/useMediaQueries'
import type { MediaEntry } from '../../hooks/queries/useMediaQueries'
import AutoGrowTextarea from '../../components/AutoGrowTextarea'
import { buildEntryUpdates } from './libraryModel'
import type { EntryDraft } from './libraryModel'

const statuses: { value: MediaEntry['status']; label: string }[] = [
  { value: 'logged', label: 'In my library' },
  { value: 'completed', label: 'Completed' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'planned', label: 'For later' },
]

export default function EntryEditor({
  entry,
  userId,
  onClose,
}: {
  entry: MediaEntry
  userId: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<EntryDraft>({
    rating: entry.rating ?? 0,
    status: entry.status,
    notes: entry.notes ?? '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const updateEntry = useUpdateEntry(userId)
  const deleteEntry = useDeleteEntry(userId)
  const isPending = updateEntry.isPending || deleteEntry.isPending
  const isReviewed = draft.status === 'completed' || draft.status === 'logged'

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending || confirmDelete) return
    setError(null)
    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        updates: buildEntryUpdates(entry, draft),
      })
      onClose()
    } catch {
      setError('Your changes could not be saved. Please try again.')
    }
  }

  async function removeEntry() {
    if (isPending) return
    setError(null)
    try {
      await deleteEntry.mutateAsync(entry.id)
      onClose()
    } catch {
      setError('This entry could not be removed. Please try again.')
    }
  }

  function changeRating(delta: number) {
    setDraft((current) => ({
      ...current,
      rating: Math.max(
        0,
        Math.min(10, Math.round((current.rating + delta) * 10) / 10)
      ),
    }))
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="entry-editor-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!isPending) onClose()
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto sheet-scroll rounded-t-[28px] border border-[#2f3946] bg-[#1b2127] p-0 text-[#f4f0e8] shadow-2xl backdrop:bg-black/75 sm:inset-0 sm:m-auto sm:max-w-xl sm:rounded-3xl"
    >
      <div
        className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#45474b] sm:hidden"
        aria-hidden="true"
      />
      <div className="flex items-center justify-between px-6 pb-3 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#96a4b3]">
          Your library · Edit entry
        </p>
        <button
          type="button"
          aria-label="Close entry editor"
          onClick={onClose}
          disabled={isPending}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#232b33] text-[#d7d3cc] transition-colors hover:bg-[#303236] disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={saveEntry}>
        <div className="space-y-6 px-6 pb-6">
          <div className="flex items-center gap-4 border-b border-[#2f3946] pb-6">
            {entry.cover_image_url ? (
              <img
                src={entry.cover_image_url}
                alt=""
                className="h-28 w-[75px] shrink-0 rounded-xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-28 w-[75px] shrink-0 items-center justify-center rounded-xl bg-[#25272b]">
                <BookOpen
                  className="h-7 w-7 text-[#96a4b3]"
                  strokeWidth={1.3}
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="mb-2 text-xs capitalize text-[#ff827a]">
                {entry.media_type}
                {entry.year ? ` · ${entry.year}` : ''}
              </p>
              <h2
                id="entry-editor-title"
                className="text-2xl font-semibold leading-tight tracking-tight"
              >
                {entry.title}
              </h2>
              {entry.genre && (
                <p className="mt-2 text-xs text-[#96a4b3]">{entry.genre}</p>
              )}
            </div>
          </div>

          <fieldset disabled={isPending}>
            <legend className="mb-3 text-sm font-medium">On your shelf</legend>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((status) => (
                <label
                  key={status.value}
                  className={`flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#ff655b] ${draft.status === status.value ? 'border-[#ff655b]/60 bg-[#ff655b]/10 text-[#ff918a]' : 'border-[#2f3946] bg-[#232b33] text-[#96a4b3]'}`}
                >
                  <input
                    type="radio"
                    name="entry-status"
                    value={status.value}
                    checked={draft.status === status.value}
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        status: status.value,
                      }))
                    }
                    className="sr-only"
                  />
                  {status.label}
                  {draft.status === status.value && (
                    <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                </label>
              ))}
            </div>
            {draft.status !== 'logged' && (
              <p className="mt-3 text-xs leading-relaxed text-[#96a4b3]">
                This entry will move to your{' '}
                {draft.status === 'planned'
                  ? 'planned'
                  : draft.status === 'completed'
                    ? 'completed'
                    : 'in progress'}{' '}
                activity on your profile.
              </p>
            )}
          </fieldset>

          {isReviewed && (
            <>
              <fieldset disabled={isPending}>
                <legend className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Star className="h-4 w-4 text-[#f2cc8f]" aria-hidden="true" />
                  Your rating
                </legend>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => changeRating(-0.1)}
                    aria-label="Decrease rating"
                    disabled={draft.rating <= 0 || isPending}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2f3946] bg-[#232b33] disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    aria-label="Rating out of 10"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="10"
                    step="0.1"
                    value={draft.rating || ''}
                    placeholder="—"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        rating: Math.min(
                          10,
                          Math.max(0, Number(event.target.value))
                        ),
                      }))
                    }
                    className="h-12 w-20 rounded-xl border border-[#2f3946] bg-[#14181c] text-center text-2xl font-semibold tabular-nums text-[#f2cc8f] focus:outline-none focus:ring-2 focus:ring-[#ff655b]"
                  />
                  <button
                    type="button"
                    onClick={() => changeRating(0.1)}
                    aria-label="Increase rating"
                    disabled={draft.rating >= 10 || isPending}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2f3946] bg-[#232b33] disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-[#96a4b3]">/ 10</span>
                  {draft.rating > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({ ...current, rating: 0 }))
                      }
                      className="ml-auto min-h-11 text-xs text-[#96a4b3] underline underline-offset-4"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </fieldset>
              <div>
                <label
                  htmlFor="entry-review"
                  className="mb-3 block text-sm font-medium"
                >
                  Notes{' '}
                  <span className="ml-1 font-normal text-[#96a4b3]">
                    (optional)
                  </span>
                </label>
                <AutoGrowTextarea
                  id="entry-review"
                  value={draft.notes}
                  disabled={isPending}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  minRows={4}
                  maxRows={14}
                  className="w-full rounded-xl border border-[#2f3946] bg-[#14181c] px-4 py-3 text-base leading-relaxed placeholder:text-[#817e79] focus:outline-none focus:ring-2 focus:ring-[#ff655b]"
                  placeholder="The moment that stayed with you…"
                />
              </div>
            </>
          )}
          <p className="text-xs text-[#96a4b3]">
            Last updated{' '}
            {new Date(entry.updated_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#ff655b]/30 bg-[#ff655b]/10 p-3 text-sm text-[#ffaaa4]"
            >
              {error}
            </p>
          )}
          {confirmDelete && (
            <div
              className="rounded-2xl border border-[#ff655b]/30 bg-[#ff655b]/5 p-4"
              role="group"
              aria-label="Confirm entry removal"
            >
              <p className="text-sm font-semibold">Remove this entry?</p>
              <p className="mt-1 text-sm leading-relaxed text-[#96a4b3]">
                Your rating and notes for this entry will also be removed.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isPending}
                  className="min-h-11 flex-1 rounded-xl border border-[#2f3946] px-3 text-sm"
                >
                  Keep entry
                </button>
                <button
                  type="button"
                  onClick={removeEntry}
                  disabled={isPending}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff655b] px-3 text-sm font-semibold text-[#181311] disabled:opacity-50"
                >
                  {deleteEntry.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Remove entry
                </button>
              </div>
            </div>
          )}
        </div>
        {!confirmDelete && (
          <div className="sticky bottom-0 flex gap-3 border-t border-[#2f3946] bg-[#1b2127] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setConfirmDelete(true)
              }}
              disabled={isPending}
              aria-label="Remove this entry"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2f3946] text-[#ff918a] disabled:opacity-40"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff655b] px-4 font-semibold text-[#181311] transition-colors hover:bg-[#ff827a] disabled:opacity-50"
            >
              {updateEntry.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {updateEntry.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </form>
    </dialog>
  )
}
