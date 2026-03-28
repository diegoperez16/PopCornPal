import { Popcorn } from 'lucide-react'

export default function SplashLoader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-5">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/20">
        <Popcorn className="w-8 h-8 text-white" />
      </div>
      <span className="text-xl font-bold text-white tracking-tight">PopcornPal</span>
      <div className="w-6 h-6 border-2 border-gray-700 border-t-red-500 rounded-full animate-spin" />
    </div>
  )
}
