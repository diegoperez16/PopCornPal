import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildOwnerTabs,
  buildVisitorTabs,
  countByList,
  isCustomList,
  labelForList,
  slugifyListTitle,
  uniqueListSlug,
} from './favoriteLists.ts'

test('a title becomes a slug the database will actually accept', () => {
  const legal = /^list-[a-z0-9][a-z0-9-]{0,38}$/
  for (const title of [
    'Favorite Spider-Man movies',
    '  Películas  ',
    'A24!!!',
    '2026 rewatches',
    '🍿🍿🍿',
    'a'.repeat(80),
  ]) {
    const slug = slugifyListTitle(title)
    assert.match(slug, legal, `${title} → ${slug}`)
    assert.ok(isCustomList(slug))
  }
  assert.equal(
    slugifyListTitle('Favorite Spider-Man movies'),
    'list-favorite-spider-man-movies'
  )
  assert.equal(slugifyListTitle('  Películas  '), 'list-peliculas')
})

test('a slug steps past the ones already taken instead of colliding', () => {
  const taken = ['list-noir', 'list-noir-2']
  assert.equal(uniqueListSlug('Noir', taken), 'list-noir-3')
  assert.equal(uniqueListSlug('Noir', []), 'list-noir')
  // A name at full length still has room made for its suffix.
  const long = uniqueListSlug('a'.repeat(80), [slugifyListTitle('a'.repeat(80))])
  assert.match(long, /^list-[a-z0-9][a-z0-9-]{0,38}$/)
  assert.ok(long.endsWith('-2'))
})

test('owner tabs keep every shelf, empty ones included', () => {
  const tabs = buildOwnerTabs({
    counts: { all: 3, 'list-noir': 1 },
    years: [2026, 2025],
    custom: [
      { id: '2', slug: 'list-noir', title: 'Noir', position: 1 },
      { id: '1', slug: 'list-capes', title: 'Capes', position: 0 },
    ],
  })
  assert.deepEqual(
    tabs.map((tab) => tab.id),
    ['all', 'movie', 'show', 'game', 'book', 'year-2026', 'year-2025', 'list-capes', 'list-noir']
  )
  assert.equal(tabs.find((tab) => tab.id === 'all').count, 3)
  assert.equal(tabs.find((tab) => tab.id === 'movie').count, 0)
  assert.equal(tabs.find((tab) => tab.id === 'list-noir').label, 'Noir')
})

test('a visitor only sees shelves with something on them', () => {
  const favorites = [
    { list: 'all' },
    { list: 'all' },
    { list: 'list-noir' },
    { list: 'year-2026' },
    { list: null },
  ]
  const custom = [{ id: '1', slug: 'list-noir', title: 'Noir' }]
  const tabs = buildVisitorTabs(favorites, custom)
  assert.deepEqual(tabs, [
    { id: 'all', label: 'All time', count: 3 },
    { id: 'year-2026', label: '2026', count: 1 },
    { id: 'list-noir', label: 'Noir', count: 1 },
  ])
  // A list whose name has not loaded yet still gets a tab, not a crash.
  assert.equal(labelForList('list-noir', []), 'list-noir')
})

test('rows written before lists existed still count as the overall top ten', () => {
  assert.deepEqual(countByList([{ list: null }, { list: undefined }, { list: 'all' }]), {
    all: 3,
  })
})
