import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAddEntryDraft,
  emptyAddEntryDraft,
  isCalendarDate,
  loadAddEntryDraft,
  saveAddEntryDraft,
  addEntryDraftKey,
} from '../src/lib/addEntryDraft.ts'

test('malformed stored drafts are replaced with a valid empty draft', () => {
  for (const value of [null, [], { version: 9 }, 'invalid'])
    assert.equal(parseAddEntryDraft(value).item, null)
  const draft = parseAddEntryDraft({
    ...emptyAddEntryDraft(),
    rating: 99,
    item: { id: 1, title: 'Movie', type: 'movie' },
    watchedDate: '2026-02-30',
  })
  assert.equal(draft.rating, 0)
  assert.notEqual(draft.watchedDate, '2026-02-30')
})

test('episode drafts are validated and duplicate episode ratings are removed', () => {
  const draft = parseAddEntryDraft({
    ...emptyAddEntryDraft(),
    item: { id: 1, title: 'Show', type: 'show' },
    pendingRatings: [
      { season: 1, episode: 1, rating: 9 },
      { season: 1, episode: 1, rating: 7 },
      { season: -1, episode: 2, rating: 8 },
      { season: 1, episode: 3, rating: Infinity },
    ],
  })
  assert.equal(draft.pendingRatings.length, 1)
  assert.equal(draft.pendingRatings[0].rating, 9)
  assert.equal(isCalendarDate('2024-02-29'), true)
  assert.equal(isCalendarDate('2025-02-29'), false)
})

test('draft storage is account scoped and storage failure cannot crash logging', () => {
  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
  const draft = {
    ...emptyAddEntryDraft(),
    item: { id: 1, title: 'Movie', type: 'movie' as const },
    notes: 'Private draft',
  }
  assert.equal(saveAddEntryDraft('a', draft, storage), true)
  assert.equal(loadAddEntryDraft('a', storage).notes, 'Private draft')
  assert.equal(loadAddEntryDraft('b', storage).notes, '')
  assert.notEqual(addEntryDraftKey('a'), addEntryDraftKey('b'))
  assert.equal(
    saveAddEntryDraft('a', draft, {
      setItem() {
        throw Error('Full')
      },
    }),
    false
  )
})
