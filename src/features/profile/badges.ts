import type { Badge } from '../../lib/supabase'

/**
 * Badge colours arrive from the database as Tailwind hue names, which cannot
 * be composed into a class at runtime, so every badge paints itself from this
 * map. Unknown hues fall back to the app's muted slate.
 */
const BADGE_HEX: Record<string, string> = {
  'purple-500': '#a855f7',
  'violet-500': '#8b5cf6',
  'indigo-500': '#6366f1',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'sky-500': '#0ea5e9',
  'cyan-500': '#06b6d4',
  'teal-500': '#14b8a6',
  'emerald-500': '#10b981',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'lime-500': '#84cc16',
  'yellow-500': '#eab308',
  'amber-500': '#f59e0b',
  'orange-500': '#f97316',
  'red-400': '#f87171',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'rose-500': '#f43f5e',
  'pink-500': '#ec4899',
  'fuchsia-500': '#d946ef',
  'slate-500': '#64748b',
}

export function badgeHex(color: string | null | undefined): string {
  if (!color) return '#6b7c8c'
  return BADGE_HEX[color] ?? BADGE_HEX[`${color.split('-')[0]}-500`] ?? '#6b7c8c'
}

export type BadgeKind = 'creator' | 'alpha' | 'earned' | 'chosen'

/**
 * Creator and Alpha Tester are the app's founding badges and wear a crown and
 * a beaker. Anything else an admin handed out is "earned"; the rest were picked
 * by the person themselves.
 */
export function badgeKind(badge: Badge): BadgeKind {
  const name = badge.name.trim().toLowerCase()
  if (name === 'creator') return 'creator'
  if (name === 'alpha tester') return 'alpha'
  return badge.admin_only ? 'earned' : 'chosen'
}

const ORDER: Record<BadgeKind, number> = { creator: 0, alpha: 1, earned: 2, chosen: 3 }

/** Founding badges first, then earned ones, then the ones you chose. */
export function sortBadges<T extends { badges?: Badge }>(list: readonly T[]): T[] {
  return list
    .filter((item) => item.badges)
    .slice()
    .sort((a, b) => ORDER[badgeKind(a.badges!)] - ORDER[badgeKind(b.badges!)])
}
