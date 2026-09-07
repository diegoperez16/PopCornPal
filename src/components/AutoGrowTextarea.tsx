import { useLayoutEffect, useRef } from 'react'

type Props = Omit<React.ComponentProps<'textarea'>, 'rows'> & {
  /** Height before anything is typed, in lines. */
  minRows?: number
  /** Height at which the field stops growing and starts scrolling, in lines. */
  maxRows?: number
}

/**
 * A notes field that grows with what is written instead of trapping a long
 * thought in a small fixed window, the way a native compose field does. It
 * stops at maxRows so it can never push the sheet's save button off screen.
 */
export default function AutoGrowTextarea({
  minRows = 3,
  maxRows = 12,
  value,
  className = '',
  ...props
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const field = ref.current
    if (!field) return

    const measure = () => {
      const styles = getComputedStyle(field)
      const lineHeight = parseFloat(styles.lineHeight) || 24
      const vertical =
        parseFloat(styles.paddingTop) +
        parseFloat(styles.paddingBottom) +
        parseFloat(styles.borderTopWidth) +
        parseFloat(styles.borderBottomWidth)
      const ceiling = lineHeight * maxRows + vertical

      // Measure from empty so the field shrinks back when text is deleted.
      field.style.height = 'auto'
      field.style.height = `${Math.min(field.scrollHeight, ceiling)}px`
      field.style.overflowY = field.scrollHeight > ceiling ? 'auto' : 'hidden'
    }

    measure()

    // Inside a <dialog> this component mounts before showModal(), while the
    // field has no layout and scrollHeight reads 0 — so it opened collapsed
    // and only sized itself once you typed. Re-measure when the box actually
    // gets a width. Width is safe to watch: setting the height cannot change
    // it, so this cannot feed back on itself.
    let lastWidth = field.getBoundingClientRect().width
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      if (width !== lastWidth) {
        lastWidth = width
        measure()
      }
    })
    observer.observe(field)
    return () => observer.disconnect()
  }, [value, maxRows])

  return (
    <textarea
      {...props}
      ref={ref}
      rows={minRows}
      value={value}
      className={`resize-none ${className}`}
    />
  )
}
