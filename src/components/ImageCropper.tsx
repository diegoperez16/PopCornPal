import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'

export interface CropData {
  x: number // percentage 0-100
  y: number // percentage 0-100
  scale: number // zoom level
}

interface UserPreviewBadge {
  name: string
  color: string
  gifUrl?: string | null
  opacity?: number | null
}

interface UserPreviewData {
  username: string
  fullName?: string | null
  bio?: string | null
  avatarUrl?: string | null
  badges?: UserPreviewBadge[]
  creatorBadge?: UserPreviewBadge | null
  alphaBadge?: UserPreviewBadge | null
}

interface ImageCropperProps {
  imageSrc: string
  userPreview: UserPreviewData
  onCropComplete: (desktopCrop: CropData, mobileCrop: CropData) => void
  onCancel: () => void
  desktopAspectRatio?: number
  mobileAspectRatio?: number
  backgroundOpacity?: number
}

export default function ImageCropper({
  imageSrc,
  userPreview: _userPreview,
  onCropComplete,
  onCancel,
  desktopAspectRatio: _desktopAspectRatio,
  mobileAspectRatio: _mobileAspectRatio,
  backgroundOpacity = 80,
}: ImageCropperProps) {
  void _desktopAspectRatio
  void _mobileAspectRatio

  const [crop, setCrop] = useState<CropData>({ x: 50, y: 50, scale: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'mouse' | 'touch' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const modalRef = useRef<HTMLDivElement | null>(null)

  const cropRef = useRef(crop)
  const dragStartRef = useRef(dragStart)
  const isDraggingRef = useRef(isDragging)

  useEffect(() => {
    cropRef.current = crop
  }, [crop])

  useEffect(() => {
    dragStartRef.current = dragStart
  }, [dragStart])

  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  // Prevent scroll on the modal when dragging
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    const preventScroll = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault()
      }
    }

    modal.addEventListener('touchmove', preventScroll, { passive: false })
    return () => {
      modal.removeEventListener('touchmove', preventScroll)
    }
  }, [])

  const getCurrentCrop = useCallback(() => cropRef.current, [])

  const setCurrentCrop = useCallback((c: CropData) => setCrop(c), [])

  const startDrag = (clientX: number, clientY: number, mode: 'mouse' | 'touch') => {
    setIsDragging(true)
    setDragMode(mode)
    setDragStart({ x: clientX, y: clientY })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY, 'mouse')
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    startDrag(touch.clientX, touch.clientY, 'touch')
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const current = getCurrentCrop()
    const ds = dragStartRef.current
    const sensitivity = 0.5
    setCurrentCrop({
      ...current,
      x: Math.max(0, Math.min(100, current.x - ((e.clientX - ds.x) * sensitivity))),
      y: Math.max(0, Math.min(100, current.y - ((e.clientY - ds.y) * sensitivity))),
    })
    setDragStart({ x: e.clientX, y: e.clientY })
  }, [getCurrentCrop, setCurrentCrop])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    const current = getCurrentCrop()
    const ds = dragStartRef.current
    const sensitivity = 0.5
    setCurrentCrop({
      ...current,
      x: Math.max(0, Math.min(100, current.x - ((touch.clientX - ds.x) * sensitivity))),
      y: Math.max(0, Math.min(100, current.y - ((touch.clientY - ds.y) * sensitivity))),
    })
    setDragStart({ x: touch.clientX, y: touch.clientY })
  }, [getCurrentCrop, setCurrentCrop])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragMode(null)
  }, [])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setDragMode(null)
  }, [])

  useEffect(() => {
    if (isDragging && dragMode === 'mouse') {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
    if (isDragging && dragMode === 'touch') {
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
      window.addEventListener('touchcancel', handleTouchEnd)
      return () => {
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
        window.removeEventListener('touchcancel', handleTouchEnd)
      }
    }
  }, [isDragging, dragMode, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  useEffect(() => {
    setImageLoaded(false)
    const img = new Image()
    img.onload = () => setImageLoaded(true)
    img.src = imageSrc
  }, [imageSrc])

  const handleZoom = useCallback((delta: number) => {
    const current = getCurrentCrop()
    setCurrentCrop({ ...current, scale: Math.max(50, Math.min(300, current.scale + delta)) })
  }, [getCurrentCrop, setCurrentCrop])

  const handleComplete = () => {
    onCropComplete(crop, crop) // same crop for both desktop and mobile
  }

  const renderBannerPreview = () => (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-gray-700/60 shadow-2xl"
      style={{ aspectRatio: '3.5 / 1' }}
    >
      {/* Background image — use <img> + object-fit so preview is aspect-ratio independent */}
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full z-0 transition-all duration-75"
        style={{
          objectFit: 'cover',
          objectPosition: `${crop.x}% ${crop.y}%`,
          transform: `scale(${Math.max(1, crop.scale / 100)})`,
          transformOrigin: `${crop.x}% ${crop.y}%`,
          opacity: backgroundOpacity / 100,
        }}
      />
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-gray-900/60 to-transparent z-10 pointer-events-none" />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{ zIndex: 5, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '33.3% 33.3%' }}
      />
      {/* Draggable overlay */}
      <div
        className={`absolute inset-0 z-20 select-none ${isDragging ? 'cursor-move' : 'cursor-grab'}`}
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />
    </div>
  )

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[70] flex flex-col sm:items-center sm:justify-center bg-black/95 sm:bg-black/90 sm:backdrop-blur-sm sm:p-4 animate-in fade-in duration-200 overflow-hidden"
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
    >
      {/* Main Container */}
      <div className="flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-gray-900 sm:border border-gray-800 sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex-none flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
          <h3 className="text-lg font-bold text-white">Crop Background</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 -mr-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 relative bg-black/40 overflow-hidden flex flex-col min-h-0">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div
            className="flex-1 w-full h-full p-4 sm:p-6 flex items-center justify-center overflow-hidden"
            style={{ touchAction: isDragging ? 'none' : 'auto' }}
          >
            <div className="w-full max-w-xl">
              {renderBannerPreview()}
            </div>
          </div>
        </div>

        {/* Bottom Toolbar */}
        <div className="flex-none bg-gray-900 border-t border-gray-800 p-4 pb-safe">
          <div className="flex flex-col gap-4 max-w-xl mx-auto">
            <p className="text-xs text-center text-gray-500">Drag to reposition · Use slider to zoom</p>

            {/* Zoom Controls */}
            <div className="flex items-center gap-4 px-2">
              <button
                type="button"
                onClick={() => handleZoom(-10)}
                className="text-gray-500 hover:text-white transition-colors p-1"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="50"
                max="300"
                value={crop.scale}
                onChange={(e) => setCrop({ ...crop, scale: parseInt(e.target.value, 10) })}
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
              />
              <button
                type="button"
                onClick={() => handleZoom(10)}
                className="text-gray-500 hover:text-white transition-colors p-1"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 w-10 text-right">{crop.scale}%</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-full transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 text-sm"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}