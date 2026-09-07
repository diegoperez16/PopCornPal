import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RATED_VERDICTS,
  circleVerdict,
  verdictFor,
} from '../src/features/verdict/verdictModel.ts'

test('each rating band earns the verdict it should, including the edges', () => {
  const cases: [number, string][] = [
    [10, 'golden'],
    [9, 'golden'],
    [8.9, 'buttered'],
    [7, 'buttered'],
    [6.9, 'half'],
    [5, 'half'],
    [4.9, 'oldmaid'],
    [3, 'oldmaid'],
    [2.9, 'burnt'],
    [0, 'burnt'],
  ]
  for (const [rating, expected] of cases) {
    assert.equal(verdictFor(rating)?.id, expected, `${rating} should be ${expected}`)
  }
})

test('saying nothing is not the same as a bad opinion', () => {
  assert.equal(verdictFor(null), null)
  assert.equal(verdictFor(undefined), null)
  assert.equal(verdictFor(Number.NaN), null)
})

test('a dumpster outranks any rating that happens to be stored with it', () => {
  assert.equal(verdictFor(null, true)?.id, 'dumpster')
  assert.equal(verdictFor(9.5, true)?.id, 'dumpster')
})

test('out-of-range ratings are clamped rather than falling through', () => {
  assert.equal(verdictFor(99)?.id, 'golden')
  assert.equal(verdictFor(-4)?.id, 'burnt')
})

test('every rated band is reachable and ordered highest first', () => {
  const mins = RATED_VERDICTS.map((verdict) => verdict.min!)
  assert.deepEqual(mins, [...mins].sort((a, b) => b - a))
  assert.equal(mins.at(-1), 0, 'the lowest band must catch every rating')
})

test('a circle averages the ratings and counts dumpsters separately', () => {
  const result = circleVerdict([
    { rating: 8 },
    { rating: 7 },
    { rating: null, dumpstered: true },
    { rating: null, dumpstered: true },
  ])
  assert.equal(result.average, 7.5)
  assert.equal(result.raters, 2)
  assert.equal(result.dumpsters, 2)
  assert.equal(result.verdict?.id, 'buttered')
})

test('dumpsters never drag the average down', () => {
  // The whole point of the button: refusing to rate must not act as a zero.
  const withoutDumpsters = circleVerdict([{ rating: 8 }, { rating: 7 }])
  const withDumpsters = circleVerdict([
    { rating: 8 },
    { rating: 7 },
    { rating: null, dumpstered: true },
  ])
  assert.equal(withDumpsters.average, withoutDumpsters.average)
  assert.equal(withDumpsters.verdict?.id, withoutDumpsters.verdict?.id)
})

test('a circle that only ever dumpstered it reads as a dumpster', () => {
  const result = circleVerdict([
    { rating: null, dumpstered: true },
    { rating: null, dumpstered: true },
  ])
  assert.equal(result.verdict?.id, 'dumpster')
  assert.equal(result.average, null)
  assert.equal(result.raters, 0)
})

test('a silent circle has no verdict at all', () => {
  const result = circleVerdict([{ rating: null }, { rating: null }])
  assert.equal(result.verdict, null)
  assert.equal(result.average, null)
  assert.equal(result.dumpsters, 0)
  assert.deepEqual(circleVerdict([]).verdict, null)
})

test('a stored rating alongside a dumpster is still excluded from the mean', () => {
  const result = circleVerdict([
    { rating: 10 },
    { rating: 1, dumpstered: true },
  ])
  assert.equal(result.average, 10)
  assert.equal(result.raters, 1)
  assert.equal(result.dumpsters, 1)
})
