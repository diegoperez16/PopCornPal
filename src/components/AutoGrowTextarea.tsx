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
