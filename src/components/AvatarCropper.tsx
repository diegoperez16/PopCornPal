import { useState, useCallback, useEffect, useRef } from 'react'
import { Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import type { AvatarCrop } from '../lib/supabase'
import Sheet from './Sheet'

interface AvatarCropperProps {
  imageSrc: string
  onCropComplete: (cropData: AvatarCrop) => void
  onCancel: () => void
  initialCrop?: AvatarCrop | null
}

export default function AvatarCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  initialCrop,
}: AvatarCropperProps) {
  const [cropData, setCropData] = useState<AvatarCrop>(
    initialCrop || { x: 50, y: 50, scale: 100 }
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'mouse' | 'touch' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)

  const modalRef = useRef<HTMLDivElement | null>(null)
  const cropAreaRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef(dragStart)
  const cropDataRef = useRef(cropData)
  const isDraggingRef = useRef(isDragging)

  // Keep refs in sync
  useEffect(() => {
    dragStartRef.current = dragStart
  }, [dragStart])

  useEffect(() => {
    cropDataRef.current = cropData
  }, [cropData])

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

  // Load image
  useEffect(() => {
    setImageLoaded(false)
    const img = new Image()
    img.onload = () => setImageLoaded(true)
    img.src = imageSrc
  }, [imageSrc])

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
    const currentCrop = cropDataRef.current
    const currentDragStart = dragStartRef.current
    const sensitivity = 0.3

    setCropData({
      ...currentCrop,
      x: Math.max(0, Math.min(100, currentCrop.x - ((e.clientX - currentDragStart.x) * sensitivity))),
      y: Math.max(0, Math.min(100, currentCrop.y - ((e.clientY - currentDragStart.y) * sensitivity))),
    })

    setDragStart({ x: e.clientX, y: e.clientY })
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()

    const touch = e.touches[0]
    if (!touch) return

    const currentCrop = cropDataRef.current
    const currentDragStart = dragStartRef.current
    const sensitivity = 0.3

    setCropData({
      ...currentCrop,
      x: Math.max(0, Math.min(100, currentCrop.x - ((touch.clientX - currentDragStart.x) * sensitivity))),
      y: Math.max(0, Math.min(100, currentCrop.y - ((touch.clientY - currentDragStart.y) * sensitivity))),
    })

    setDragStart({ x: touch.clientX, y: touch.clientY })
  }, [])

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

  const handleZoom = (delta: number) => {
    setCropData(prev => ({
      ...prev,
      scale: Math.max(100, Math.min(300, prev.scale + delta)),
    }))
  }

  const handleReset = () => {
    setCropData({ x: 50, y: 50, scale: 100 })
  }

  const handleComplete = () => {
    onCropComplete(cropData)
  }

  // Handle wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -5 : 5
    setCropData(prev => ({
      ...prev,
      scale: Math.max(100, Math.min(300, prev.scale + delta)),
    }))
  }, [])

  useEffect(() => {
    const cropArea = cropAreaRef.current
    if (!cropArea) return

    cropArea.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      cropArea.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const preview = {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${cropData.scale}%`,
    backgroundPosition: `${cropData.x}% ${cropData.y}%`,
    backgroundRepeat: 'no-repeat',
  }

  return (
    // A drag that runs past the picture must not count as a tap on the
    // backdrop, so this sheet only closes from its buttons and Escape.
    <Sheet
      title="Crop profile picture"
      onClose={onCancel}
      dismissOnBackdrop={false}
      footer={
        <div className="space-y-4">
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
              min="100"
              max="300"
              value={cropData.scale}
              aria-label="Zoom"
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                setCropData(prev => ({ ...prev, scale: val }))
              }}
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
            <span className="w-12 text-right text-xs tabular-nums text-muted">{cropData.scale}%</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="app-icon-button"
              aria-label="Reset crop"
            >
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="app-button-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="app-button-primary flex-1"
            >
              <Check size={16} />
              Apply
            </button>
          </div>
        </div>
      }
    >
      <div
        ref={modalRef}
        className="relative"
        style={{ touchAction: isDragging ? 'none' : 'auto' }}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        <div className="flex flex-col items-center gap-6 py-2">
          {/* Circular crop area */}
          <div
            ref={cropAreaRef}
            className="relative h-64 w-64 cursor-move select-none overflow-hidden rounded-full border-4 border-line-soft sm:h-72 sm:w-72"
            style={{ touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div
              className="absolute inset-0 transition-transform duration-75"
              style={preview}
            />

            {/* Crosshair */}
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gray-50/50" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-gray-50/50" />
            </div>

            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20">
                <div className="rounded-lg bg-gray-900/70 px-3 py-1.5 text-xs font-medium text-gray-50 backdrop-blur-sm">
                  Dragging…
                </div>
              </div>
            )}
          </div>

          {/* How it reads at every size */}
          <div className="flex items-end gap-4">
            {[
              { label: 'Large', size: 'h-16 w-16 border-2' },
              { label: 'Medium', size: 'h-10 w-10 border-2' },
              { label: 'Small', size: 'h-6 w-6 border' },
            ].map(({ label, size }) => (
              <div key={label} className="text-center">
                <div
                  className={`mx-auto overflow-hidden rounded-full border-line-soft ${size}`}
                  style={preview}
                />
                <p className="mt-1 text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted">
            Drag to reposition · Scroll or use the slider to zoom
          </p>
        </div>
      </div>
    </Sheet>
  )
}
