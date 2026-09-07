import type { HouseId } from './houseModel'

/**
 * The house animal, drawn as a CSS mask rather than an <img>.
 *
 * The source art is a near-black silhouette, which would disappear against a
 * dark medallion. Masking lets the shape be painted in any colour the ring or
 * card needs, and keeps one asset per house instead of one per colourway.
 */
export default function HouseBeast({
  house,
  size = 22,
  color = 'currentColor',
  className = '',
}: {
  house: HouseId
  size?: number
  color?: string
  className?: string
}) {
  const mask = `url(/houses/mask-${house}.png) center / contain no-repeat`
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        // A className can override these when the size must be relative.
        width: size || undefined,
        height: size || undefined,
        background: color,
        WebkitMask: mask,
        mask,
        display: 'inline-block',
      }}
    />
  )
}
