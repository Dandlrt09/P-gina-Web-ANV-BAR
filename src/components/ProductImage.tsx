import { useEffect, useRef, useState } from 'react'
import type { ProductImage as ProductImageData } from '../data/catalog'

type ProductImageProps = {
  image?: ProductImageData
  alt: string
  className?: string
}

/**
 * Imagen de producto: muestra la foto real cuando existe `src`;
 * de lo contrario un placeholder tipográfico elegante con `label`.
 *
 * Si la foto tiene `secondarySrc`, al pasar el mouse se funde (crossfade)
 * hacia la secundaria y al quitarlo regresa a la principal. El fundido es
 * una transición de opacidad suave, distinta del cambio seco de `src`.
 * Respeta prefers-reduced-motion: sin cruce de imagen (solo el zoom de
 * tarjeta que ya maneja el CSS con motion-reduce).
 */
export function ProductImage({ image, alt, className = '' }: ProductImageProps) {
  const [hovered, setHovered] = useState(false)
  const reducedRef = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }, [])

  if (image?.src) {
    const hasSecondary = Boolean(image.secondarySrc)
    const showSecondary = hovered && hasSecondary && !reducedRef.current

    if (hasSecondary) {
      return (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`relative overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none ${className}`}
        >
          <img
            src={image.src}
            alt={alt}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none ${
              showSecondary ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <img
            src={image.secondarySrc}
            alt={alt}
            loading="lazy"
            aria-hidden={!showSecondary}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none ${
              showSecondary ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      )
    }

    return (
      <img
        src={image.src}
        alt={alt}
        loading="lazy"
        className={`transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transform-none ${className}`}
      />
    )
  }
  return (
    <div className={`flex items-center justify-center bg-brand-primary/5 ${className}`}>
      <span className="px-4 text-center font-display text-base italic tracking-wide text-brand-primary/70">
        {image?.label ?? alt}
      </span>
    </div>
  )
}