import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeShelf } from './shelfSummary.ts'

test('a shelf is summarised from ratings alone', () => {
  const summary = summarizeShelf([
    { rating: 10, dumpstered: false },
    { rating: 9.5, dumpstered: false },
    { rating: 4, dumpstered: false },
    { rating: null, dumpstered: false },
    { rating: null, dumpstered: true },
  ])
  assert.equal(summary.titles, 5)
  assert.equal(summary.dumpsters, 1)
  assert.equal(summary.goldens, 2)
  assert.equal(summary.average, (10 + 9.5 + 4) / 3)
})

test('a dumpster never drags the average down, even carrying a stored rating', () => {
  const summary = summarizeShelf([
    { rating: 8, dumpstered: false },
    { rating: 1, dumpstered: true },
  ])
  assert.equal(summary.average, 8)
  assert.equal(summary.dumpsters, 1)
})

test('an unrated shelf has no average rather than a zero', () => {
  assert.deepEqual(summarizeShelf([{ rating: null }]), {
    titles: 1,
    average: null,
    goldens: 0,
    dumpsters: 0,
  })
  assert.deepEqual(summarizeShelf([]), {
    titles: 0,
    average: null,
    goldens: 0,
    dumpsters: 0,
  })
})
