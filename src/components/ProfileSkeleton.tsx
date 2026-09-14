/** The profile's shape while it loads: banner, avatar, identity, tabs, a shelf, a few rows. */
export default function ProfileSkeleton() {
  return (
    <div className="app-page">
      <div
        className="mx-auto max-w-3xl px-5 pt-4 sm:pt-6"
        role="status"
        aria-busy="true"
        aria-label="Loading profile"
      >
        {/* Banner */}
        <div className="h-40 animate-pulse rounded-2xl bg-surface-strong sm:h-52" />

        {/* Avatar overlapping the banner, then three lines of identity */}
        <div className="relative z-10 -mt-10 px-1 sm:-mt-14 sm:px-2">
          <div className="h-20 w-20 animate-pulse rounded-full border-4 border-gray-900 bg-surface-strong sm:h-28 sm:w-28" />
          <div className="mt-3 space-y-2">
            <div className="h-7 w-40 animate-pulse rounded-lg bg-surface-strong" />
            <div className="h-4 w-24 animate-pulse rounded bg-surface-strong" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-strong" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 h-12 animate-pulse rounded-full bg-surface-strong" />

        {/* Poster shelf */}
        <div className="no-scrollbar -mx-5 mt-4 flex gap-4 overflow-x-auto px-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="aspect-[2/3] w-24 shrink-0 animate-pulse rounded-xl bg-surface-strong sm:w-28"
            />
          ))}
        </div>

        {/* List rows */}
        <div className="mt-8 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-strong" />
          ))}
        </div>
      </div>
    </div>
  )
}
