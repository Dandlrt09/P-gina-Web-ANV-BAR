import type { ProductImage as ProductImageData } from '../data/catalog'

type ProductImageProps = {
  image?: ProductImageData
  alt: string
  className?: string
}

/**
 * Imagen de producto: muestra la foto real cuando existe `src`;
 * de lo contrario un placeholder tipográfico elegante con `label`
 * (fondo neutro + tipografía de marca).
 */
export function ProductImage({ image, alt, className = '' }: ProductImageProps) {
  if (image?.src) {
    return <img src={image.src} alt={alt} loading="lazy" className={className} />
  }
  return (
    <div className={`flex items-center justify-center bg-brand-primary/5 ${className}`}>
      <span className="px-4 text-center font-display text-base italic tracking-wide text-brand-primary/70">
        {image?.label ?? alt}
      </span>
    </div>
  )
}