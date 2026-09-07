import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HOUSE_LIST,
  SORTING_MINIMUM,
  isHouseId,
  sortByShelf,
} from '../src/features/house/houseModel.ts'

type Shelf = Parameters<typeof sortByShelf>[0]

function shelf(
  ratings: (number | null)[],
  { type = 'movie', dumpsters = 0 } = {}
): Shelf {
  const entries = ratings.map((rating, i) => ({
    id: `e${i}`,
    user_id: 'u',
    media_type: type,
    title: `Title ${i}`,
    rating,
    dumpstered: false,
    status: 'logged',
    completed_date: null,
    notes: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  }))
  for (let i = 0; i < dumpsters; i += 1) {
    entries.push({
      ...entries[0],
      id: `d${i}`,
      title: `Dumped ${i}`,
      rating: null,
      dumpstered: true,
    })
  }
  return entries as unknown as Shelf
}

test('a shelf too thin to read gets no house rather than a guess', () => {
  assert.equal(sortByShelf(shelf([])), null)
  assert.equal(sortByShelf(shelf([8, 7, 9])), null)
  assert.equal(sortByShelf(shelf(Array(SORTING_MINIMUM).fill(8))) !== null, true)
})

test('rating from the extremes reads as Gryffindor', () => {
  const sorting = sortByShelf(shelf([10, 9.5, 2, 1, 9, 10]))
  assert.equal(sorting?.house.id, 'gryffindor')
})

test('decimals and a bookish shelf read as Ravenclaw', () => {
  const sorting = sortByShelf(shelf([7.4, 6.8, 8.2, 7.1, 6.3, 8.4], { type: 'book' }))
  assert.equal(sorting?.house.id, 'ravenclaw')
})

test('a generous, even-handed shelf reads as Hufflepuff', () => {
  const sorting = sortByShelf(shelf([8, 8, 8, 7, 8, 8]))
  assert.equal(sorting?.house.id, 'hufflepuff')
})

test('a hard marker who uses the dumpster reads as Slytherin', () => {
  const sorting = sortByShelf(shelf([5, 4, 6, 5, 4], { dumpsters: 3 }))
  assert.equal(sorting?.house.id, 'slytherin')
})

test('the reason quotes the reader’s own numbers back to them', () => {
  const sorting = sortByShelf(shelf([8, 8, 8, 7, 8, 8]))
  assert.match(sorting!.because, /7\.8|7\.9|8\.0/)
  assert.ok(sorting!.because.length > 20)
})

test('dumpsters count toward having a readable shelf', () => {
  // Someone who has only ever dumpstered things has still said plenty.
  assert.notEqual(sortByShelf(shelf([], { dumpsters: SORTING_MINIMUM })), null)
})

test('every house is reachable and has wool, a stripe and a trait', () => {
  assert.equal(HOUSE_LIST.length, 4)
  for (const house of HOUSE_LIST) {
    assert.equal(house.colors.length, 2)
    assert.match(house.colors[0], /^#[0-9a-f]{6}$/i)
    assert.match(house.colors[1], /^#[0-9a-f]{6}$/i)
    assert.ok(house.trait.length > 10)
    assert.ok(isHouseId(house.id))
  }
  assert.equal(isHouseId('muggle'), false)
  assert.equal(isHouseId(null), false)
})
