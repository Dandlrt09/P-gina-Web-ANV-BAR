import { useEffect, useMemo, useState } from 'react'
import { formatCOP, type Product, type ProductImage } from '../data/catalog'

type QuickViewModalProps = {
  product: Product
  onClose: () => void
  onOpenDetail: (product: Product) => void
}

/**
 * Vista rápida del producto: modal con galería de imágenes navegable con
 * flechas (‹ ›) en proporción 4:5 real de las fotos, swatches de color
 * reales (hex exacto de la paleta/variante), sin hover de cambio de
 * imagen (esa interacción vive en las tarjetas del catálogo).
 * Cierra con Escape, clic en el fondo o el botón de cerrar.
 */
export function QuickViewModal({ product, onClose, onOpenDetail }: QuickViewModalProps) {
  const [colorIndex, setColorIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const color = product.colors[Math.min(colorIndex, product.colors.length - 1)] ?? product.colors[0]

  /** Imágenes únicas del producto (editorial + variantes con foto real,
   *  incluidas las secundarias V2 para navegar con las flechas). */
  const images = useMemo<ProductImage[]>(() => {
    const seen = new Set<string>()
    const push = (image: ProductImage | undefined) => {
      if (image?.src && !seen.has(image.src)) {
        seen.add(image.src)
        list.push(image)
      }
    }
    const list: ProductImage[] = []
    if (product.featuredImage) {
      push(product.featuredImage)
      if (product.featuredImage.secondarySrc) {
        push({ src: product.featuredImage.secondarySrc, label: product.featuredImage.label })
      }
    }
    for (const variant of product.colors) {
      push(variant.image)
      if (variant.image?.secondarySrc) {
        push({ src: variant.image.secondarySrc, label: variant.image.label })
      }
    }
    return list
  }, [product])

  const goTo = (next: number) => {
    if (images.length <= 1) return
    const target = ((next % images.length) + images.length) % images.length
    setImageIndex(target)
  }

  useEffect(() => {
    // Al cambiar de color, salta a la foto de esa variante si existe.
    const variantImage = product.colors[colorIndex]?.image
    if (variantImage?.src) {
      const idx = images.findIndex((img) => img.src === variantImage.src)
      if (idx !== -1) setImageIndex(idx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorIndex, product])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') goTo(imageIndex - 1)
      if (event.key === 'ArrowRight') goTo(imageIndex + 1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, imageIndex, images.length])

  const current = images[Math.min(imageIndex, images.length - 1)]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vista rápida de ${product.name}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-negro/50 sm:items-center sm:p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="relative">
          <div className="relative h-[46dvh] w-full overflow-hidden bg-white/80 sm:h-[52dvh]">
            {current?.src ? (
              <img
                key={current.src}
                src={current.src}
                alt={current.label ?? product.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="px-4 text-center font-display text-base italic tracking-wide text-brand-primary/70">
                  {current?.label ?? product.name}
                </span>
              </div>
            )}

            {/* Flechas de galería */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    goTo(imageIndex - 1)
                  }}
                  aria-label="Imagen anterior"
                  className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-brand-primary/20 bg-surface/95 text-brand-primary shadow-sm transition-colors hover:bg-brand-primary hover:text-surface"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    goTo(imageIndex + 1)
                  }}
                  aria-label="Imagen siguiente"
                  className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-brand-primary/20 bg-surface/95 text-brand-primary shadow-sm transition-colors hover:bg-brand-primary hover:text-surface"
                >
                  ›
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-xs tabular-nums text-brand-deep">
                  {imageIndex + 1} / {images.length}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista rápida"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface/90 text-lg text-brand-deep transition-colors hover:bg-surface"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">{product.category}</p>
          <h3 className="mt-1 font-display text-2xl font-medium text-brand-deep">{product.name}</h3>
          <p className="mt-1 text-lg font-semibold text-brand-primary">
            {formatCOP(product.priceCOP)}
          </p>
          <p className="mt-1 text-sm text-brand-primary/80">Bajo pedido 3-5 días</p>

          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink/80">
            {product.editorial}
          </p>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-brand-deep">Colores</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {product.colors.map((variant, index) => (
                <button
                  key={variant.name}
                  type="button"
                  onClick={() => setColorIndex(index)}
                  aria-label={`Color ${variant.name}`}
                  aria-pressed={index === colorIndex}
                  title={variant.name}
                  className={`size-9 rounded-full border-2 ${
                    index === colorIndex
                      ? 'border-brand-primary ring-2 ring-brand-primary/30'
                      : 'border-brand-primary/20'
                  }`}
                  style={{ backgroundColor: variant.hex }}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-ink/70">{color.name}</p>
          </fieldset>

          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            className="mt-5 w-full rounded-full bg-brand-primary py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
          >
            Ver ficha completa
          </button>
        </div>
      </div>
    </div>
  )
}