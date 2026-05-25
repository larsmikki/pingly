import type { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Surface({ children, className = '', style, ...rest }: Props) {
  return (
    <div
      className={`rounded-2xl bg-surface border border-border shadow-card ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
