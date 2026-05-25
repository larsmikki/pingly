import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  dot?: string
  children: ReactNode
}

export function Pill({ active, dot, children, className = '', style, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-opacity hover:opacity-90 ${active ? 'bg-accent text-white shadow-pill-active' : 'bg-surface text-text2 border border-border'} ${className}`}
      style={style}
      {...rest}
    >
      {dot && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: active ? '#fff' : dot }}
        />
      )}
      {children}
    </button>
  )
}
