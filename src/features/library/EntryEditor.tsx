import { useState } from 'react'
import { BookOpen, Check, Loader2, Trash2 } from 'lucide-react'
import {
  useDeleteEntry,
  useUpdateEntry,
} from '../../hooks/queries/useMediaQueries'
import type { MediaEntry } from '../../hooks/queries/useMediaQueries'
import NoteField from '../../components/NoteField'
import RatingField from '../../components/RatingField'
import Sheet from '../../components/Sheet'
import { buildEntryUpdates, STATUS_LABELS } from './libraryModel'
import type { EntryDraft } from './libraryModel'

const statuses: { value: MediaEntry['status']; label: string }[] = [
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'in-progress', label: STATUS_LABELS['in-progress'] },
  { value: 'planned', label: STATUS_LABELS.planned },
  { value: 'logged', label: STATUS_LABELS.logged },
]
const typeNames: Record<MediaEntry['media_type'], string> = {
  movie: 'Movie',
  show: 'Show',
  game: 'Game',
  book: 'Book',
}

export default function EntryEditor({
  entry,
  userId,
  onClose,
}: {
  entry: MediaEntry
  userId: string
  onClose: () => void
}) {
  const [draft, setDraft] = useState<EntryDraft>({
    rating: entry.rating ?? 0,
    dumpstered: Boolean(entry.dumpstered),
    status: entry.status,
    notes: entry.notes ?? '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const updateEntry = useUpdateEntry(userId)
  const deleteEntry = useDeleteEntry(userId)
  const isPending = updateEntry.isPending || deleteEntry.isPending
  const isReviewed = draft.status === 'completed' || draft.status === 'logged'
  const meta = [typeNames[entry.media_type] ?? entry.media_type, entry.year]
    .filter(Boolean)
    .join(' · ')

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

  return (
    <Sheet
      ariaLabel={`Edit ${entry.title}`}
      onClose={onClose}
      closeLabel="Close entry editor"
      closeDisabled={isPending}
      header={
        <div className="flex items-center gap-4 pt-1">
          {entry.cover_image_url ? (
            <img
              src={entry.cover_image_url}
              alt=""
              className="h-[100px] w-[68px] shrink-0 rounded-xl border border-line-soft bg-surface-strong object-cover"
            />
          ) : (
            <div className="flex h-[100px] w-[68px] shrink-0 items-center justify-center rounded-xl border border-line-soft bg-surface-strong text-muted">
              <BookOpen size={26} strokeWidth={1.4} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="entry-editor-title"
              className="text-xl font-semibold leading-tight tracking-tight text-gray-50"
            >
              {entry.title}
            </h2>
            <p className="mt-1 text-sm text-muted">{meta}</p>
            {entry.genre && (
              <p className="mt-0.5 truncate text-xs text-muted">{entry.genre}</p>
            )}
          </div>
        </div>
      }
      footer={
        !confirmDelete && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setConfirmDelete(true)
              }}
              disabled={isPending}
              aria-label="Remove this entry"
              className="app-icon-button h-12 w-12 rounded-xl border border-line-soft hover:text-danger"
            >
              <Trash2 size={20} />
            </button>
            <button
              type="submit"
              form="entry-editor-form"
              disabled={isPending}
              className="app-button-primary flex-1"
            >
              {updateEntry.isPending ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <Check size={18} aria-hidden="true" />
              )}
              {updateEntry.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )
      }
    >
      <form id="entry-editor-form" onSubmit={saveEntry} className="space-y-5 pt-1">
        <fieldset disabled={isPending}>
          <legend className="app-label">On your shelf</legend>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map((status) => {
              const selected = draft.status === status.value
              return (
                <label
                  key={status.value}
                  className={`app-option cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-butter-400 ${selected ? 'is-on' : ''}`}
                >
                  <input
                    type="radio"
                    name="entry-status"
                    value={status.value}
                    checked={selected}
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        status: status.value,
                      }))
                    }
                    className="sr-only"
                  />
                  {status.label}
                  {selected && (
                    <Check size={16} className="shrink-0" aria-hidden="true" />
                  )}
                </label>
              )
            })}
          </div>
          {draft.status !== 'logged' && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              This entry will show under{' '}
              {STATUS_LABELS[draft.status].toLowerCase()} on your profile.
            </p>
          )}
        </fieldset>

        {isReviewed && (
          <RatingField
            rating={draft.rating}
            onChange={(rating) =>
              setDraft((current) => ({ ...current, rating, dumpstered: false }))
            }
            dumpstered={draft.dumpstered}
            onToggleDumpster={() =>
              setDraft((current) => ({
                ...current,
                dumpstered: !current.dumpstered,
                rating: 0,
              }))
            }
            disabled={isPending}
          />
        )}

        <NoteField
          id="entry-review"
          label="Notes"
          title={entry.title}
          subtitle={meta}
          placeholder="The moment that stayed with you…"
          value={draft.notes}
          onChange={(notes) => setDraft((current) => ({ ...current, notes }))}
          disabled={isPending}
        />

        <p className="text-xs text-muted">
          Last updated{' '}
          {new Date(entry.updated_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        {error && (
          <p role="alert" className="app-note app-note-danger">
            {error}
          </p>
        )}

        {confirmDelete && (
          <div
            className="rounded-2xl border border-danger/30 bg-danger/10 p-4"
            role="group"
            aria-label="Confirm entry removal"
          >
            <p className="text-sm font-semibold text-gray-50">Remove this entry?</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Your rating and notes for this entry will also be removed.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isPending}
                className="app-button-secondary flex-1"
              >
                Keep entry
              </button>
              <button
                type="button"
                onClick={removeEntry}
                disabled={isPending}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-danger px-3 text-sm font-bold text-gray-50 disabled:opacity-50"
              >
                {deleteEntry.isPending && (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                )}
                Remove entry
              </button>
            </div>
          </div>
        )}
      </form>
    </Sheet>
  )
}
