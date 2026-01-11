import { Grid } from '@giphy/react-components'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { X, Search } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

// You'll need to get a free API key from https://developers.giphy.com/
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'YOUR_API_KEY_HERE'
const gf = new GiphyFetch(GIPHY_API_KEY)

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchKey, setSearchKey] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Measure container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const fetchGifs = (offset: number) => {
    if (searchTerm.trim()) {
      return gf.search(searchTerm, { offset, limit: 10 })
    }
    return gf.trending({ offset, limit: 10 })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchKey(prev => prev + 1) // Force Grid to re-fetch
  }

  // Calculate columns based on screen width
  const getColumns = () => {
    if (containerWidth < 400) return 2
    if (containerWidth < 600) return 3
    return 4
  }

  return (
    <div className="bg-gray-900 rounded-xl w-full max-w-3xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden border border-gray-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-white">Choose a GIF</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b border-gray-700 flex-shrink-0">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for GIFs..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
            />
          </form>
        </div>

        {/* GIF Grid */}
        <div 
          ref={containerRef}
          className="p-2 sm:p-4 overflow-y-auto flex-1"
        >
          {containerWidth > 0 && (
            <Grid
              width={containerWidth - (window.innerWidth < 640 ? 16 : 32)}
              columns={getColumns()}
              fetchGifs={fetchGifs}
              onGifClick={(gif, e) => {
                e.preventDefault()
                onSelect(gif.images.original.url)
                onClose()
              }}
              key={`${searchKey}-${searchTerm}`}
            />
          )}
        </div>
      </div>
  )
}
