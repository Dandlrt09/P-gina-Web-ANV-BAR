import { createElement, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ElementType, ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  delay?: number
  className?: string
  as?: ElementType
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Scroll reveal: fades content in with a slight rise the first time it
 * enters the viewport. Runs once and is fully disabled for users who
 * prefer reduced motion.
 */
export function Reveal({ children, delay = 0, className = '', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const update = () => setReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node || reducedMotion || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        node.style.opacity = '1'
        node.style.transform = 'translateY(0)'
        observer.unobserve(node)
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [reducedMotion])

  const hiddenStyle: CSSProperties | undefined = reducedMotion
    ? undefined
    : { opacity: 0, transform: 'translateY(24px)', transitionDelay: `${delay}ms` }

  const revealClasses = reducedMotion
    ? className
    : `${className} transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none`

  return createElement(as, { ref, className: revealClasses, style: hiddenStyle }, children)
}