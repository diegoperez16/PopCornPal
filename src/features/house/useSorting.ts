import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { MediaEntry } from '../../hooks/queries/useMediaQueries'
import { HOUSES, isHouseId, sortByShelf, type Sorting } from './houseModel'

/**
 * Asks the sort-house function to read the shelf, and falls back to the local
 * heuristic whenever it cannot: offline, no API key configured, rate limited,
 * or any error. Sorting is never allowed to be unavailable — the model makes
 * the reason better, it is not a dependency.
 */
export function useSorting(entries: readonly MediaEntry[]) {
  const [sorting, setSorting] = useState<Sorting | null>(null)
  const [thinking, setThinking] = useState(false)
  /** True when the shown reason came from the local heuristic instead. */
  const [usedFallback, setUsedFallback] = useState(false)

  async function sort({ includeNotes }: { includeNotes: boolean }) {
    setThinking(true)
    setUsedFallback(false)
    try {
      const { data, error } = await supabase.functions.invoke<{
        house?: unknown
        because?: unknown
      }>('sort-house', { body: { includeNotes } })
      if (error) throw error
      // The house list belongs to the client; only the id and the prose are
      // taken from the response.
      const house = data?.house
      const because = data?.because
      if (!isHouseId(house) || typeof because !== 'string' || !because.trim()) {
        throw new Error('unexpected sorting response')
      }
      setSorting({ house: HOUSES[house], because: because.trim() })
    } catch {
      setSorting(sortByShelf(entries))
      setUsedFallback(true)
    } finally {
      setThinking(false)
    }
  }

  return {
    sorting,
    thinking,
    usedFallback,
    sort,
    clear: () => setSorting(null),
  }
}
