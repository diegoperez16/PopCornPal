
// Removed unused React import

export default function FeedSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        
        {/* Create Post Skeleton */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse flex-shrink-0"></div>
            <div className="flex-1 space-y-3">
              <div className="w-full h-12 bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse"></div>
                </div>
                <div className="w-20 h-8 bg-gray-800 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button Skeleton */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center">
            <div className="w-32 h-8 bg-gray-800 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Posts Feed Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 sm:p-6"
            >
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-20 h-3 bg-gray-800 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Post Content */}
              <div className="space-y-2 mb-4">
                <div className="w-full h-4 bg-gray-800 rounded animate-pulse"></div>
                <div className="w-full h-4 bg-gray-800 rounded animate-pulse"></div>
                <div className="w-3/4 h-4 bg-gray-800 rounded animate-pulse"></div>
              </div>

              {/* Media Entry Skeleton (Optional in some posts) */}
              {i % 2 === 0 && (
                <div className="bg-gray-900/50 rounded-lg p-3 mb-4 flex items-center gap-3 border border-gray-800">
                  <div className="w-16 h-20 bg-gray-800 rounded animate-pulse flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-48 h-5 bg-gray-800 rounded animate-pulse"></div>
                    <div className="w-24 h-4 bg-gray-800 rounded animate-pulse"></div>
                  </div>
                </div>
              )}

              {/* Post Actions */}
              <div className="flex items-center gap-6 pt-3 border-t border-gray-700">
                <div className="w-12 h-5 bg-gray-800 rounded animate-pulse"></div>
                <div className="w-12 h-5 bg-gray-800 rounded animate-pulse"></div>
                <div className="w-8 h-5 bg-gray-800 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
