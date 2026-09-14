import { Grid } from '@giphy/react-components'
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Search } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import Sheet from './Sheet'

// You'll need to get a free API key from https://developers.giphy.com/
const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'YOUR_API_KEY_HERE'
const gf = new GiphyFetch(GIPHY_API_KEY)

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

/** Renders its own sheet; mount it conditionally, no wrapper needed. */
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
    <Sheet title="Choose a GIF" onClose={onClose} size="wide" bodyClassName="!px-0 !pb-0">
      <form onSubmit={handleSearch} className="app-search px-5 pb-3">
        <Search size={18} />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search GIFs"
          aria-label="Search GIFs"
          enterKeyHint="search"
          className="app-input"
        />
      </form>
      <div ref={containerRef} className="min-h-[40dvh] px-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {containerWidth > 0 && (
          <Grid
            width={containerWidth}
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
    </Sheet>
  )
}
