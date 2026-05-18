import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  rightSlot?: ReactNode
}

export function Panel({
  title,
  subtitle,
  rightSlot,
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-slate-800/90 bg-slate-950/70 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.8)] backdrop-blur-sm',
        className,
      )}
      {...rest}
    >
      {(title || subtitle || rightSlot) && (
        <header className="flex items-start justify-between border-b border-slate-800/70 px-3 py-2.5">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
          </div>
          {rightSlot}
        </header>
      )}
      {children}
    </section>
  )
}

