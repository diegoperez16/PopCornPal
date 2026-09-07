import { useEffect, useRef, useState } from 'react'
import { queryClient } from '../lib/queryClient'
const PTR_THRESHOLD = 70

export default function PullToRefresh() {
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullYRef = useRef(0)
  const refreshingRef = useRef(false)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      startYRef.current = 0
      if (
        document.querySelector('dialog[open]') ||
        (e.target as Element).closest(
          'input, textarea, select, [contenteditable]'
        )
      )
        return
      if (window.scrollY === 0 && !refreshingRef.current) {
        startYRef.current = e.touches[0].clientY
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!startYRef.current || window.scrollY > 0) return
      const raw = e.touches[0].clientY - startYRef.current
      if (raw <= 0) return
      const damped = Math.min(raw * 0.45, PTR_THRESHOLD + 20)
      pullYRef.current = damped
      setPullY(damped)
    }

    const onTouchEnd = () => {
      const dist = pullYRef.current
      startYRef.current = 0
      pullYRef.current = 0
      setPullY(0)
      if (dist >= PTR_THRESHOLD * 0.8 && !refreshingRef.current) {
        refreshingRef.current = true
        setRefreshing(true)
        // Only refetch active queries for the current screen to avoid turning a
        // route-local gesture into app-wide network churn.
        queryClient.refetchQueries({ type: 'active' }).finally(() => {
          refreshingRef.current = false
          setRefreshing(false)
        })
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const visible = pullY > 4 || refreshing
  const progress = Math.min(pullY / PTR_THRESHOLD, 1)
  // Indicator emerges from top: at pullY=0 it's fully hidden above, at pullY=PTR_THRESHOLD it's fully visible
  const translateY = refreshing ? 16 : Math.max(pullY - 40, -40)

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 flex justify-center z-[600] pointer-events-none"
      style={{
        transform: `translateY(${translateY}px)`,
        transition: refreshing ? 'transform 0.2s ease' : 'none',
      }}
    >
      <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 shadow-xl flex items-center justify-center">
        {refreshing ? (
          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            className="w-5 h-5 text-gray-400"
            style={{
              transform: `rotate(${progress * 210}deg)`,
              opacity: 0.4 + progress * 0.6,
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        )}
      </div>
    </div>
  )
}
