
export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Back Button Skeleton */}
        <div className="w-16 h-5 bg-gray-800 rounded animate-pulse mb-6"></div>

        {/* Profile Header Skeleton */}
        <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-5 sm:p-8 mb-8 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
            {/* Avatar */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 rounded-full bg-gray-800 animate-pulse"></div>
            </div>
            
            {/* Info */}
            <div className="flex-1 w-full flex flex-col gap-4">
              <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 mb-2 space-y-3">
                <div className="w-48 h-8 bg-gray-800 rounded animate-pulse mx-auto sm:mx-0"></div>
                <div className="w-32 h-6 bg-gray-800 rounded animate-pulse mx-auto sm:mx-0"></div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-3/4 h-4 bg-gray-800 rounded animate-pulse mx-auto sm:mx-0"></div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 justify-center mt-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-6 bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-16 h-3 bg-gray-800 rounded animate-pulse"></div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-6 bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-16 h-3 bg-gray-800 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Library Button Skeleton */}
        <div className="mb-10 w-full h-14 bg-gray-800/50 rounded-xl animate-pulse"></div>

        {/* Recent Activity Skeleton */}
        <div className="mb-12 space-y-4">
          <div className="w-40 h-6 bg-gray-800 rounded animate-pulse mb-4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 bg-gray-800/30 p-3 rounded-xl border border-gray-700/50">
              <div className="w-12 h-16 bg-gray-800 rounded animate-pulse flex-shrink-0"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="w-3/4 h-5 bg-gray-800 rounded animate-pulse"></div>
                <div className="w-1/2 h-4 bg-gray-800 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Posts Skeleton */}
        <div className="mb-8">
          <div className="w-32 h-6 bg-gray-800 rounded animate-pulse mb-4"></div>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 space-y-3">
                    <div className="w-32 h-4 bg-gray-800 rounded animate-pulse"></div>
                    <div className="w-full h-4 bg-gray-800 rounded animate-pulse"></div>
                    <div className="w-3/4 h-4 bg-gray-800 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
