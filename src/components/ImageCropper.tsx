import { useState, useCallback, useEffect, useRef } from 'react'
import { Check, ZoomIn, ZoomOut } from 'lucide-react'
import Sheet from './Sheet'

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
      className="relative w-full overflow-hidden rounded-2xl border border-line-soft"
      style={{ aspectRatio: '3.5 / 1' }}
    >
      {/* Background image — use <img> + object-fit so preview is aspect-ratio independent */}
      <img
        src={imageSrc}
        alt=""
        draggable={false}
        className="absolute inset-0 z-0 h-full w-full transition-all duration-75"
        style={{
          objectFit: 'cover',
          objectPosition: `${crop.x}% ${crop.y}%`,
          transform: `scale(${Math.max(1, crop.scale / 100)})`,
          transformOrigin: `${crop.x}% ${crop.y}%`,
          opacity: backgroundOpacity / 100,
        }}
      />
      {/* Bottom fade, the same one the profile paints over the banner */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-gray-900/60 to-transparent" />
      {/* Rule-of-thirds grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{ zIndex: 5, backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '33.3% 33.3%' }}
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
    // A drag that runs past the picture must not count as a tap on the
    // backdrop, so this sheet only closes from its buttons and Escape.
    <Sheet
      title="Crop background"
      onClose={onCancel}
      size="wide"
      dismissOnBackdrop={false}
      footer={
        <div className="space-y-4">
          <p className="text-center text-xs text-muted">Drag to reposition · Use the slider to zoom</p>

          {/* Zoom */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleZoom(-10)}
              className="app-icon-button"
              aria-label="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <input
              type="range"
              min="50"
              max="300"
              value={crop.scale}
              aria-label="Zoom"
              onChange={(e) => setCrop({ ...crop, scale: parseInt(e.target.value, 10) })}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => handleZoom(10)}
              className="app-icon-button"
              aria-label="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <span className="w-12 text-right text-xs tabular-nums text-muted">{crop.scale}%</span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="app-button-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="app-button-primary"
            >
              <Check size={16} />
              Save
            </button>
          </div>
        </div>
      }
    >
      <div
        ref={modalRef}
        className="relative py-2 text-gray-50"
        style={{ touchAction: isDragging ? 'none' : 'auto' }}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}
        {renderBannerPreview()}
      </div>
    </Sheet>
  )
}
