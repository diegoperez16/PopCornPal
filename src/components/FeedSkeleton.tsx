const pulse = 'animate-pulse rounded bg-surface-strong'

export default function FeedSkeleton() {
  return (
    <div className="app-page" aria-busy="true">
      <div className="max-w-3xl mx-auto px-5 py-7 sm:py-10">
        <span className="sr-only">Loading your feed</span>

        {/* Title row */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className={`${pulse} h-9 w-52 rounded-lg`} />
          <div className={`${pulse} h-11 w-11 rounded-xl`} />
        </div>

        {/* Composer */}
        <div className="app-panel mb-6 rounded-2xl p-4 sm:p-5">
          <div className="flex gap-3">
            <div className={`${pulse} h-10 w-10 shrink-0 rounded-full`} />
            <div className="min-w-0 flex-1">
              <div className="space-y-2 py-2">
                <div className={`${pulse} h-4 w-3/4`} />
                <div className={`${pulse} h-4 w-1/2`} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3">
                <div className="flex gap-1">
                  <div className={`${pulse} h-11 w-11 rounded-xl`} />
                  <div className={`${pulse} h-11 w-11 rounded-xl`} />
                  <div className={`${pulse} h-11 w-11 rounded-xl`} />
                </div>
                <div className={`${pulse} h-11 w-20 rounded-full`} />
              </div>
            </div>
          </div>
        </div>

        {/* Section heading */}
        <div className="mt-8 mb-5 border-b border-line-soft pb-4">
          <div className={`${pulse} h-5 w-40`} />
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="app-panel rounded-2xl p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className={`${pulse} h-10 w-10 shrink-0 rounded-full`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`${pulse} h-4 w-28`} />
                  <div className={`${pulse} h-3 w-16`} />
                </div>
              </div>
              <div className="mb-3 space-y-2">
                <div className={`${pulse} h-4 w-full`} />
                <div className={`${pulse} h-4 w-5/6`} />
                {i === 1 && <div className={`${pulse} h-4 w-3/4`} />}
              </div>
              {i === 0 && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-line-soft bg-surface-sunken p-3">
                  <div className={`${pulse} h-20 w-14 shrink-0 rounded-lg`} />
                  <div className="flex-1 space-y-2">
                    <div className={`${pulse} h-4 w-36`} />
                    <div className={`${pulse} h-3 w-20`} />
                  </div>
                </div>
              )}
              <div className="flex gap-1 border-t border-line-soft pt-2">
                <div className={`${pulse} h-11 w-14 rounded-full`} />
                <div className={`${pulse} h-11 w-14 rounded-full`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
