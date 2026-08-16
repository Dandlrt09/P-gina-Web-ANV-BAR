import type { ReactNode } from 'react'

type ContainerProps = {
  children: ReactNode
  className?: string
}

/**
 * Horizontal layout primitive: centers content at max width with
 * consistent gutters across breakpoints.
 */
export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}