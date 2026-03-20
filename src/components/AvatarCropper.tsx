import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import type { AvatarCrop } from '../lib/supabase'

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

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 sm:bg-black/90 sm:backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-hidden"
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
    >
      {/* Main Container */}
      <div className="flex flex-col w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
          <h3 className="text-lg font-bold text-white">
            Crop Profile Picture
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 -mr-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="flex-1 relative bg-black/60 p-6 sm:p-8">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Crop Preview Container */}
          <div className="flex flex-col items-center gap-6">
            {/* Circular Crop Area */}
            <div
              ref={cropAreaRef}
              className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl cursor-move select-none"
              style={{ touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Image */}
              <div
                className="absolute inset-0 transition-transform duration-75"
                style={{
                  backgroundImage: `url(${imageSrc})`,
                  backgroundSize: `${cropData.scale}%`,
                  backgroundPosition: `${cropData.x}% ${cropData.y}%`,
                  backgroundRepeat: 'no-repeat',
                }}
              />

              {/* Overlay Grid */}
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50"></div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50"></div>
              </div>

              {/* Drag indicator */}
              {isDragging && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-white font-medium">
                    Dragging...
                  </div>
                </div>
              )}
            </div>

            {/* Mini Preview */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-700 shadow-lg mx-auto"
                  style={{
                    backgroundImage: `url(${imageSrc})`,
                    backgroundSize: `${cropData.scale}%`,
                    backgroundPosition: `${cropData.x}% ${cropData.y}%`,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                <p className="text-[10px] text-gray-500 mt-1">Large</p>
              </div>
              <div className="text-center">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-700 shadow-lg mx-auto"
                  style={{
                    backgroundImage: `url(${imageSrc})`,
                    backgroundSize: `${cropData.scale}%`,
                    backgroundPosition: `${cropData.x}% ${cropData.y}%`,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                <p className="text-[10px] text-gray-500 mt-1">Medium</p>
              </div>
              <div className="text-center">
                <div
                  className="w-6 h-6 rounded-full overflow-hidden border border-gray-700 shadow-lg mx-auto"
                  style={{
                    backgroundImage: `url(${imageSrc})`,
                    backgroundSize: `${cropData.scale}%`,
                    backgroundPosition: `${cropData.x}% ${cropData.y}%`,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                <p className="text-[10px] text-gray-500 mt-1">Small</p>
              </div>
            </div>

            {/* Instructions */}
            <p className="text-xs text-gray-500 text-center">
              Drag to reposition • Scroll or use slider to zoom
            </p>
          </div>
        </div>

        {/* Bottom Toolbar */}
        <div className="flex-none bg-gray-900 border-t border-gray-800 p-4">
          <div className="flex flex-col gap-4">
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleZoom(-10)}
                className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-gray-800 rounded-lg"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="100"
                max="300"
                value={cropData.scale}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setCropData(prev => ({ ...prev, scale: val }))
                }}
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
              />
              <button
                type="button"
                onClick={() => handleZoom(10)}
                className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-gray-800 rounded-lg"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 w-12 text-right">{cropData.scale}%</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="p-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors"
                aria-label="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 text-sm"
              >
                <Check className="w-4 h-4" />
                Apply
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}