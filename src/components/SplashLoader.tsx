
// Removed unused React import
import { Film, Popcorn, Star, Clapperboard, Sparkles } from 'lucide-react'

export default function SplashLoader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Dynamic Background Spotlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/20 via-transparent to-transparent blur-3xl transform -translate-y-1/2"></div>
      </div>

      {/* Floating Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 animate-[float_6s_ease-in-out_infinite] opacity-20">
          <Star className="w-8 h-8 text-yellow-500" />
        </div>
        <div className="absolute top-3/4 right-1/4 animate-[float_8s_ease-in-out_infinite_reverse] opacity-20">
          <Clapperboard className="w-10 h-10 text-gray-500" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 animate-[float_7s_ease-in-out_infinite] opacity-20" style={{ animationDelay: '1s' }}>
          <Sparkles className="w-6 h-6 text-pink-500" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-12 group">
          {/* Outer Glow Ring */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 animate-pulse"></div>
          
          {/* Main Icon Group */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Spinning Reel Ring */}
            <div className="absolute inset-0 border-4 border-gray-800 rounded-full animate-[spin_8s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-700 rounded-full"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-gray-700 rounded-full"></div>
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-700 rounded-full"></div>
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-700 rounded-full"></div>
            </div>

            {/* Inner Film Icon */}
            <Film className="w-32 h-32 text-gray-800/50 absolute animate-[spin_12s_linear_infinite_reverse]" />
            
            {/* Central Popcorn Element */}
            <div className="relative z-10 bg-gradient-to-br from-red-500 to-pink-600 p-6 rounded-2xl shadow-2xl shadow-red-500/30 animate-[bounce_2s_infinite]">
               <div className="relative">
                 <Popcorn className="w-14 h-14 text-white drop-shadow-xl transform transition-transform group-hover:scale-110 duration-300" />
                 
                 {/* Popping Kernels Effect */}
                 <div className="absolute -top-2 -right-2 w-2 h-2 bg-yellow-300 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                 <div className="absolute -top-4 left-1/2 w-1.5 h-1.5 bg-white rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0.5s' }}></div>
               </div>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-6 relative">
          <div className="overflow-hidden">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-500 via-pink-500 to-red-500 bg-size-200 bg-clip-text text-transparent animate-[gradient_3s_ease_infinite]">
              PopcornPal
            </h1>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            {/* Custom Cinema Loader Bar */}
            <div className="w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-pink-500 animate-[loading_1.5s_ease-in-out_infinite] w-full origin-left transform scale-x-0"></div>
            </div>
            
            <p className="text-gray-400 text-sm font-medium tracking-wider uppercase opacity-80 animate-pulse">
              Preparing your theater...
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes loading {
          0% { transform: scaleX(0); transform-origin: left; }
          50% { transform: scaleX(0.5); transform-origin: left; }
          100% { transform: scaleX(0); transform-origin: right; }
        }
        .bg-size-200 {
          background-size: 200% auto;
        }
      `}</style>
    </div>
  )
}
