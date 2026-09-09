/**
 * The shelves a profile is divided into.
 *
 * Five of them are fixed (the overall top ten and one per media type), one
 * appears per year, and the rest are named by the person whose profile it is —
 * "Favourite Spider-Man movies". A named list is stored as `list-<slug>` in
 * profile_favorites, with its title in profile_favorite_lists, so renaming a
 * list never moves what is on it.
 *
 * Owner and visitor views disagree about which tabs to show — you see your
 * empty shelves because you are the one who fills them; a visitor only sees
 * shelves with something on them — so both are built here from the same parts.
 */

export type CustomList = {
  id: string
  /** The `list-…` value stored on each favourite. */
  slug: string
  title: string
  position?: number | null
}

export type FavoriteTab = { id: string; label: string; count: number }

export const BUILT_IN_LISTS = [
  { id: 'all', label: 'All time' },
  { id: 'movie', label: 'Movies' },
  { id: 'show', label: 'Shows' },
  { id: 'game', label: 'Games' },
  { id: 'book', label: 'Books' },
] as const

export const CUSTOM_LIST_PREFIX = 'list-'
export const LIST_TITLE_MAX = 40
/** The database allows `list-` plus 39 more characters; stay inside it. */
const SLUG_BODY_MAX = 39

export function isCustomList(id: string): boolean {
  return id.startsWith(CUSTOM_LIST_PREFIX)
}

export function isYearList(id: string): boolean {
  return /^year-\d{4}$/.test(id)
}

/**
 * A title turned into the slug that will hold it. Accents are folded rather
 * than dropped, so "Películas" stays recognisable as "peliculas".
 */
export function slugifyListTitle(title: string): string {
  const body = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_BODY_MAX)
    .replace(/-+$/, '')
  // A title with nothing sluggable in it (emoji, another script) still needs a
  // stable, legal slug rather than a rejected insert.
  return CUSTOM_LIST_PREFIX + (body || `l${Date.now().toString(36)}`)
}

/** The same slug, stepped past any this person already uses. */
export function uniqueListSlug(
  title: string,
  taken: readonly string[]
): string {
  const base = slugifyListTitle(title)
  if (!taken.includes(base)) return base
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const tail = `-${suffix}`
    const trimmed = base
      .slice(0, CUSTOM_LIST_PREFIX.length + SLUG_BODY_MAX - tail.length)
      .replace(/-+$/, '')
    const candidate = `${trimmed}${tail}`
    if (!taken.includes(candidate)) return candidate
  }
  return `${CUSTOM_LIST_PREFIX}l${Date.now().toString(36)}`
}

/** What to call a list in a tab: its title, its year, or its fixed name. */
export function labelForList(
  id: string,
  custom: readonly CustomList[] = []
): string {
  const builtIn = BUILT_IN_LISTS.find((list) => list.id === id)
  if (builtIn) return builtIn.label
  if (isYearList(id)) return id.slice('year-'.length)
  return custom.find((list) => list.slug === id)?.title ?? id
}

/** How many favourites sit on each list, keyed by list id. */
export function countByList(
  favorites: readonly { list?: string | null }[]
): Record<string, number> {
  return favorites.reduce<Record<string, number>>((counts, favorite) => {
    const list = favorite.list ?? 'all'
    counts[list] = (counts[list] ?? 0) + 1
    return counts
  }, {})
}

/**
 * The owner's tabs: every fixed list, every year worth offering, then the named
 * lists in the order they were arranged — empty ones included, since an empty
 * shelf is an invitation to the person who owns it.
 */
export function buildOwnerTabs({
  counts,
  years,
  custom,
}: {
  counts: Record<string, number>
  years: readonly number[]
  custom: readonly CustomList[]
}): FavoriteTab[] {
  return [
    ...BUILT_IN_LISTS.map((list) => ({ id: list.id, label: list.label })),
    ...years.map((year) => ({ id: `year-${year}`, label: String(year) })),
    ...sortCustom(custom).map((list) => ({
      id: list.slug,
      label: list.title,
    })),
  ].map((tab) => ({ ...tab, count: counts[tab.id] ?? 0 }))
}

/**
 * A visitor's tabs: only shelves with something on them, overall first. Nobody
 * wants to browse somebody else's empty shelves.
 */
export function buildVisitorTabs(
  favorites: readonly { list?: string | null }[],
  custom: readonly CustomList[] = []
): FavoriteTab[] {
  const counts = countByList(favorites)
  const order = [
    ...BUILT_IN_LISTS.map((list) => list.id),
    ...sortCustom(custom).map((list) => list.slug),
  ]
  const rank = (id: string) => {
    const known = order.indexOf(id)
    // Years sit between the fixed lists and the named ones, newest first.
    return known >= 0 ? known : BUILT_IN_LISTS.length - 0.5
  }
  return Object.keys(counts)
    .sort((a, b) => {
      const byRank = rank(a) - rank(b)
      if (byRank !== 0) return byRank
      return isYearList(a) && isYearList(b) ? b.localeCompare(a) : a.localeCompare(b)
    })
    .map((id) => ({ id, label: labelForList(id, custom), count: counts[id] }))
}

function sortCustom(custom: readonly CustomList[]): CustomList[] {
  return [...custom].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.title.localeCompare(b.title)
  )
}
