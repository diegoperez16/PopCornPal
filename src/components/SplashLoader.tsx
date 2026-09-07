import Brand from './brand/Brand'

export default function SplashLoader() {
  return (
    <div
      className="flex min-h-[70dvh] flex-col items-center justify-center gap-7"
      role="status"
      aria-label="Loading Popcorn Pal"
    >
      <Brand />
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-butter-400"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
