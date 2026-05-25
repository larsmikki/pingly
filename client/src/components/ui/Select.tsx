import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', style, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-surface2 text-text border border-border ${className}`}
        style={style}
        {...rest}
      >
        {children}
      </select>
    )
  },
)
