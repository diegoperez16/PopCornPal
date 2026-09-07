import { useThemeStore } from '../../store/themeStore'
import HouseBeast from './HouseBeast'
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
  beast = false,
  children,
}: {
  house: string | null | undefined
  /**
   * Show the house beast on a medallion. Opt-in per usage rather than by
   * breakpoint: a 32px comment avatar and an 80px profile avatar live on the
   * same viewport, so only the caller knows whether there is room.
   */
  beast?: boolean
  children: React.ReactNode
}) {
  const themeId = useThemeStore((state) => state.theme.id)
  if (themeId !== 'wizarding' || !isHouseId(house)) return <>{children}</>

  const { name, colors } = HOUSES[house]
  const [wool, stripe] = colors

  // Eight wide bands, not sixteen narrow ones: a real scarf has few, broad
  // stripes, and anything finer turns to mush by the time the avatar is 40px.
  const circumference = 2 * Math.PI * 44

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
        <circle cx="50" cy="50" r="44" fill="none" stroke={wool} strokeWidth="9.5" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={stripe}
          strokeWidth="9.5"
          strokeDasharray={`${circumference / 16} ${circumference / 16}`}
          strokeDashoffset={circumference / 32}
        />
        {/* Dark lips top and bottom give the wool a thickness of its own
            rather than letting it float on the background. */}
        <circle cx="50" cy="50" r="48.8" fill="none" stroke="rgb(var(--pp-gray-950-rgb))" strokeWidth="1.8" opacity=".55" />
        <circle cx="50" cy="50" r="39.4" fill="none" stroke="rgb(var(--pp-gray-950-rgb))" strokeWidth="1.8" opacity=".55" />
        <circle
          cx="50"
          cy="50"
          r="37.6"
          fill="none"
          stroke="rgb(var(--pp-gray-950-rgb))"
          strokeWidth="1.6"
        />
      </svg>
      {beast && (
      <span
        className="pointer-events-none absolute -bottom-[14%] left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full"
        style={{
          width: '38%',
          aspectRatio: '1',
          background: wool,
          boxShadow: `0 0 0 2px rgb(var(--pp-gray-950-rgb)), inset 0 0 0 2px ${stripe}`,
        }}
      >
        <HouseBeast house={house} size={0} color={stripe} className="h-[62%] w-[62%]" />
      </span>
      )}
    </span>
  )
}
