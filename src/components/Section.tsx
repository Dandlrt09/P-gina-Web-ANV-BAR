import type { ReactNode } from 'react'
import { Container } from './Container'

type SectionProps = {
  id?: string
  children: ReactNode
  className?: string
}

/**
 * Vertical section primitive: breathing-room padding plus the shared
 * horizontal container, so every section keeps block + inline rhythm.
 */
export function Section({ id, children, className = '' }: SectionProps) {
  return (
    <section id={id} className={`py-14 sm:py-20 ${className}`}>
      <Container>{children}</Container>
    </section>
  )
}