import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  fullWidth?: boolean
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'text-white bg-brand-gradient',
  secondary: 'bg-surface2 text-text border border-border',
  ghost: 'bg-transparent text-text2',
  danger: 'bg-surface2 text-danger border border-border',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', leadingIcon, trailingIcon, fullWidth, className = '', style, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${variant === 'primary' && size === 'lg' ? 'shadow-btn-primary' : ''} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={style}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  )
})
