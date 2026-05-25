import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  highlighted?: boolean
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { invalid, highlighted, className = '', style, ...rest },
  ref,
) {
  const borderClass = invalid ? 'border-danger' : highlighted ? 'border-accent' : 'border-border'
  return (
    <input
      ref={ref}
      className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none placeholder:opacity-40 bg-surface2 text-text border ${borderClass} ${className}`}
      style={style}
      {...rest}
    />
  )
})
