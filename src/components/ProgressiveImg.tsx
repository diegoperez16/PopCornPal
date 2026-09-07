import { useState } from 'react'

interface ProgressiveImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Layout classes for the wrapper, such as filling a fixed-size cover frame. */
  wrapperClassName?: string
  /** Extra classes for the shimmer placeholder behind the image */
  placeholderClass?: string
}

/**
 * Renders an <img> that starts invisible with a shimmer placeholder,
 * then fades in once the browser has decoded the image.
 * Accepts standard img props; size the wrapper separately for fixed cover frames.
 */
export default function ProgressiveImg({ className = '', wrapperClassName = '', placeholderClass = '', onError, ...props }: ProgressiveImgProps) {
  const [loaded, setLoaded] = useState(false)
  const [hidden, setHidden] = useState(false)

  if (hidden) return null

  return (
    <div className={`relative ${wrapperClassName} ${placeholderClass}`}>
      {/* Shimmer placeholder — visible until image loads */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse rounded-[inherit]" />
      )}
      <img
        {...props}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setHidden(true)
          onError?.(e)
        }}
      />
    </div>
  )
}
