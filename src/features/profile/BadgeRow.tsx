import { useState, type CSSProperties } from 'react'
import Sheet from '../../components/Sheet'
import type { Badge, UserBadge } from '../../lib/supabase'
import { badgeHex, badgeKind, sortBadges } from './badges'

/**
 * A badge as a medal: a round face showing the badge's own artwork, or its
 * colour when it has none. Nothing is drawn on top, so the picture is the
 * badge. The two founding badges carry a slow sheen so they read as the rare
 * ones.
 */
export function BadgeMedal({ badge, size = 28 }: { badge: Badge; size?: number }) {
  const kind = badgeKind(badge)
  return (
    <span
      className={`badge-medal ${kind === 'creator' || kind === 'alpha' ? 'is-special' : ''}`}
      style={{ width: size, height: size, '--badge': badgeHex(badge.color) } as CSSProperties}
      aria-hidden="true"
    >
      {badge.gif_url && <img src={badge.gif_url} alt="" loading="lazy" decoding="async" />}
    </span>
  )
}

function badgeOrigin(userBadge: UserBadge): string {
  const kind = badgeKind(userBadge.badges!)
  const since = userBadge.given_at
    ? new Date(userBadge.given_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null
  const who =
    kind === 'creator'
      ? 'The one who built this place.'
      : kind === 'alpha'
        ? 'Here before it was finished.'
        : kind === 'earned'
          ? 'Given by the Popcorn Pal team.'
          : 'Chosen for this profile.'
  return since ? `${who} Since ${since}.` : who
}

/**
 * The badges someone wears, as a row of medals you can tap. Tapping opens
 * the badge large, with what it means and when it was earned — a badge is
 * the most personal thing on a profile, so it deserves more than a pill.
 */
export default function BadgeRow({
  badges,
  className = '',
}: {
  badges: readonly UserBadge[]
  className?: string
}) {
  const [open, setOpen] = useState<UserBadge | null>(null)
  const worn = sortBadges(badges)
  if (worn.length === 0) return null

  return (
    <>
      <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Badges">
        {worn.map((userBadge) => {
          const badge = userBadge.badges!
          return (
            <li key={userBadge.id}>
              <button
                type="button"
                onClick={() => setOpen(userBadge)}
                className="badge-chip"
                style={{ '--badge': badgeHex(badge.color) } as CSSProperties}
              >
                <BadgeMedal badge={badge} size={28} />
                <span className="badge-chip-name">{badge.name}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {open?.badges && (
        <Sheet size="narrow" ariaLabel={`${open.badges.name} badge`} onClose={() => setOpen(null)}>
          <div className="flex flex-col items-center px-2 pb-4 pt-3 text-center">
            {open.badges.gif_url ? (
              // The whole picture, uncropped, as large as the sheet allows.
              <img
                src={open.badges.gif_url}
                alt={`${open.badges.name} badge artwork`}
                className="max-h-80 w-full rounded-2xl border border-line-soft bg-surface-sunken object-contain"
              />
            ) : (
              <BadgeMedal badge={open.badges} size={128} />
            )}
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-gray-50">{open.badges.name}</h2>
            {open.badges.description && (
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-gray-200">{open.badges.description}</p>
            )}
            <p className="mt-4 text-xs text-muted">{badgeOrigin(open)}</p>
          </div>
        </Sheet>
      )}
    </>
  )
}
