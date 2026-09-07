import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEntryUpdates,
  collectLibraryEntries,
  countLibraryEntries,
  selectLibraryEntries,
} from './libraryModel.ts'

function entry(overrides = {}) {
  return {
    id: 'one',
    user_id: 'user',
    media_type: 'movie',
    title: 'Arrival',
    rating: null,
    status: 'logged',
    completed_date: null,
    notes: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  }
}

test('collection keeps the latest canonical entry and excludes activity records', () => {
  const newest = entry({
    id: 'latest',
    title: ' ARRIVAL ',
    updated_at: '2026-02-01',
  })
  const book = entry({ id: 'book', media_type: 'book' })
  const collection = collectLibraryEntries([
    entry(),
    newest,
    entry({ id: 'activity', status: 'completed' }),
    book,
  ])
  assert.deepEqual(collection, [newest, book])
  assert.deepEqual(countLibraryEntries(collection), {
    movie: 1,
    show: 0,
    game: 0,
    book: 1,
  })
})

test('search trims whitespace, combines with media filtering, and sorting does not mutate the source', () => {
  const source = [
    entry({ id: 'b', title: 'Zodiac', rating: null }),
    entry({ id: 'a', title: 'Arrival', rating: 9 }),
    entry({ id: 'c', title: 'Arrival', media_type: 'book', rating: 8 }),
  ]
  assert.deepEqual(
    selectLibraryEntries(source, {
      search: ' ARRIVAL ',
      type: 'movie',
      sort: 'title',
    }).map((item) => item.id),
    ['a']
  )
  assert.deepEqual(
    selectLibraryEntries(source, {
      search: '',
      type: null,
      sort: 'rating',
    }).map((item) => item.id),
    ['a', 'c', 'b']
  )
  assert.equal(source[0].id, 'b')
})

test('entry updates normalize ratings and notes, set completion date, and clear stale dates', () => {
  assert.deepEqual(
    buildEntryUpdates(
      entry(),
      { status: 'completed', rating: 8.46, notes: '  A favorite.  ' },
      '2026-09-07'
    ),
    {
      status: 'completed',
      rating: 8.5,
      notes: 'A favorite.',
      completed_date: '2026-09-07',
    }
  )
  assert.deepEqual(
    buildEntryUpdates(entry({ completed_date: '2026-01-01' }), {
      status: 'planned',
      rating: 0,
      notes: '  ',
    }),
    { status: 'planned', rating: null, notes: null, completed_date: null }
  )
  assert.equal(
    buildEntryUpdates(entry({ completed_date: '2026-01-01' }), {
      status: 'completed',
      rating: 10,
      notes: '',
    }).completed_date,
    '2026-01-01'
  )
})
