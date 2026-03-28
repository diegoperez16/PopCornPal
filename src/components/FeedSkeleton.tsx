
export default function FeedSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Create Post Skeleton */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700/60 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="w-full h-10 bg-gray-700/60 rounded-lg animate-pulse" />
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-700/60 rounded-full animate-pulse" />
                  <div className="w-8 h-8 bg-gray-700/60 rounded-full animate-pulse" />
                </div>
                <div className="w-16 h-8 bg-gray-700/60 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-700/60 animate-pulse flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-28 h-3.5 bg-gray-700/60 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-gray-700/60 rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="w-full h-3.5 bg-gray-700/60 rounded animate-pulse" />
                <div className="w-5/6 h-3.5 bg-gray-700/60 rounded animate-pulse" />
                {i === 1 && <div className="w-3/4 h-3.5 bg-gray-700/60 rounded animate-pulse" />}
              </div>
              {i === 0 && (
                <div className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-3 mb-3 border border-gray-700/40">
                  <div className="w-12 h-16 bg-gray-700/60 rounded animate-pulse flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="w-36 h-4 bg-gray-700/60 rounded animate-pulse" />
                    <div className="w-20 h-3 bg-gray-700/60 rounded animate-pulse" />
                  </div>
                </div>
              )}
              <div className="flex gap-5 pt-3 border-t border-gray-700/50">
                <div className="w-10 h-4 bg-gray-700/60 rounded animate-pulse" />
                <div className="w-10 h-4 bg-gray-700/60 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
