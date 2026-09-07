import { useThemeStore } from '../../store/themeStore'
import { HOUSES, isHouseId } from './houseModel'

/**
 * A knitted house scarf wrapped around an avatar.
 *
 * Wrap any avatar container in this and it stays out of the way: the scarf
 * only appears for viewers who are in the Wizarding season, so the wizarding
 * layer exists only for people who opted into it. Sized in percentages so one
 * component serves the 112px profile avatar and the 32px comment avatar alike.
 */
export default function HouseRing({
  house,
  children,
}: {
  house: string | null | undefined
  children: React.ReactNode
}) {
  const themeId = useThemeStore((state) => state.theme.id)
  if (themeId !== 'wizarding' || !isHouseId(house)) return <>{children}</>

  const { name, colors } = HOUSES[house]
  const [wool, stripe] = colors

  // Stitches read as knitting rather than a printed band; a few too many and
  // they turn to mush at small sizes, a few too few and it looks machined.
  const stitches = Array.from({ length: 34 }, (_, i) => {
    const angle = ((i * (360 / 34) - 90) * Math.PI) / 180
    const x = 50 + Math.cos(angle) * 44
    const y = 50 + Math.sin(angle) * 44
    const rotation = (angle * 180) / Math.PI + 90
    return (
      <path
        key={i}
        d={`M${x - 2.1} ${y + 1.5} l2.1 -2.6 l2.1 2.6`}
        fill="none"
        stroke={stripe}
        strokeWidth="1.05"
        strokeLinecap="round"
        opacity=".75"
        transform={`rotate(${rotation} ${x} ${y})`}
      />
    )
  })

  return (
    <span className="relative inline-flex shrink-0">
      {children}
      <svg
        viewBox="0 0 100 112"
        className="pointer-events-none absolute -inset-[13%] bottom-[-22%] h-auto w-[126%]"
        role="img"
        aria-label={`${name} house scarf`}
      >
        {/* Tassels sit behind the band so the wool reads as the front face. */}
        <g strokeLinecap="round">
          <path d="M39 88 l-3.5 13" stroke={wool} strokeWidth="2.6" />
          <path d="M44.5 90 l-2 13.5" stroke={stripe} strokeWidth="2.6" />
          <path d="M56 90 l2.5 13.5" stroke={wool} strokeWidth="2.6" />
          <path d="M61 88 l4 13" stroke={stripe} strokeWidth="2.6" />
        </g>
        <circle cx="50" cy="50" r="44" fill="none" stroke={wool} strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={stripe}
          strokeWidth="9"
          strokeDasharray="8.6 8.6"
          strokeDashoffset="4.3"
        />
        {stitches}
        {/* A dark lip where the wool meets the photo, so they never blend. */}
        <circle
          cx="50"
          cy="50"
          r="39.6"
          fill="none"
          stroke="rgb(var(--pp-gray-950-rgb))"
          strokeWidth="1.6"
        />
      </svg>
    </span>
  )
}
