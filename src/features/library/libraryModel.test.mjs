import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildEntryUpdates,
  collectLibraryEntries,
  collectUniqueMedia,
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
      {
        status: 'completed',
        rating: 8.46,
        dumpstered: false,
        notes: '  A favorite.  ',
      },
      '2026-09-07'
    ),
    {
      status: 'completed',
      rating: 8.5,
      dumpstered: false,
      notes: 'A favorite.',
      completed_date: '2026-09-07',
    }
  )
  assert.deepEqual(
    buildEntryUpdates(entry({ completed_date: '2026-01-01' }), {
      status: 'planned',
      rating: 0,
      dumpstered: false,
      notes: '  ',
    }),
    {
      status: 'planned',
      rating: null,
      dumpstered: false,
      notes: null,
      completed_date: null,
    }
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

test('unique media collapses a title to one row and prefers the library record', () => {
  const rows = [
    entry({ id: 'activity', status: 'completed', updated_at: '2026-03-01' }),
    entry({ id: 'library', status: 'logged', updated_at: '2026-01-01' }),
    entry({ id: 'dup-activity', status: 'in-progress', updated_at: '2026-02-01' }),
  ]
  const unique = collectUniqueMedia(rows)
  assert.equal(unique.length, 1)
  assert.equal(unique[0].id, 'library')
})

test('unique media falls back to the newest activity when nothing is logged', () => {
  const unique = collectUniqueMedia([
    entry({ id: 'older', status: 'planned', updated_at: '2026-01-01' }),
    entry({ id: 'newer', status: 'completed', updated_at: '2026-05-01' }),
  ])
  assert.deepEqual(unique.map((e) => e.id), ['newer'])
})

test('unique media keeps different titles and types apart', () => {
  const unique = collectUniqueMedia([
    entry({ id: 'movie', title: 'Dune' }),
    entry({ id: 'book', title: 'Dune', media_type: 'book' }),
    entry({ id: 'spaced', title: '  dune  ' }),
  ])
  assert.equal(unique.length, 2)
})

test('editing keeps a dumpster free of any rating', () => {
  const target = entry({ rating: 8, status: 'logged' })
  const updates = buildEntryUpdates(target, {
    rating: 8,
    dumpstered: true,
    status: 'logged',
    notes: 'unwatchable',
  })
  assert.equal(updates.dumpstered, true)
  assert.equal(updates.rating, null, 'a dumpster must not carry a number')
  assert.equal(updates.notes, 'unwatchable')
})

test('clearing a dumpster lets a rating stand again', () => {
  const updates = buildEntryUpdates(entry(), {
    rating: 7.25,
    dumpstered: false,
    status: 'completed',
    notes: '',
  })
  assert.equal(updates.dumpstered, false)
  assert.equal(updates.rating, 7.3)
  assert.equal(updates.notes, null)
})

test('a rating floor keeps only titles that clear it', () => {
  const shelf = [
    entry({ id: 'high', title: 'High', rating: 9.2 }),
    entry({ id: 'mid', title: 'Mid', rating: 6.5 }),
    entry({ id: 'unrated', title: 'Unrated', rating: null }),
  ]
  const kept = selectLibraryEntries(shelf, {
    type: null, search: '', sort: 'recent', minRating: 7,
  })
  assert.deepEqual(kept.map((e) => e.title), ['High'])
})

test('a dumpster never satisfies a rating floor', () => {
  // Refusing to rate something is not a score, so it cannot clear "7 and up".
  const shelf = [
    entry({ id: 'dump', title: 'Dumped', rating: null, dumpstered: true }),
    entry({ id: 'good', title: 'Good', rating: 8 }),
  ]
  const kept = selectLibraryEntries(shelf, {
    type: null, search: '', sort: 'recent', minRating: 7,
  })
  assert.deepEqual(kept.map((e) => e.title), ['Good'])
})

test('no floor leaves everything, including the unrated', () => {
  const shelf = [entry({ id: 'a', rating: null }), entry({ id: 'b', title: 'B', rating: 3 })]
  assert.equal(selectLibraryEntries(shelf, { type: null, search: '', sort: 'recent' }).length, 2)
})

test('a band keeps only the titles inside it', () => {
  const shelf = [
    entry({ id: 'a', title: 'Ten', rating: 10 }),
    entry({ id: 'b', title: 'NineFive', rating: 9.5 }),
    entry({ id: 'c', title: 'Nine', rating: 9 }),
    entry({ id: 'd', title: 'EightNine', rating: 8.9 }),
  ]
  const nines = selectLibraryEntries(shelf, {
    type: null, search: '', sort: 'recent', minRating: 9, maxRating: 9.9,
  })
  assert.deepEqual(nines.map((e) => e.title).sort(), ['Nine', 'NineFive'])

  const tens = selectLibraryEntries(shelf, {
    type: null, search: '', sort: 'recent', minRating: 10, maxRating: 10,
  })
  assert.deepEqual(tens.map((e) => e.title), ['Ten'])
})
