import { useEffect, useState } from 'react'
import { formatCOP, type Product } from './catalog'
import { ProductGallery } from './ProductGallery'

type QuickViewModalProps = {
  product: Product
  onClose: () => void
  onOpenDetail: (product: Product) => void
}

/**
 * Vista rápida del producto: modal con galería de imágenes navegable con
 * flechas (‹ ›) en proporción real de las fotos, swatches de color reales
 * (hex exacto de la paleta/variante), sin hover de cambio de imagen (esa
 * interacción vive en las tarjetas del catálogo). Cierra con Escape, clic
 * en el fondo o el botón de cerrar. "Ver ficha completa" navega a la
 * pantalla de producto por hash (#/producto/<id>).
 */
export function QuickViewModal({ product, onClose, onOpenDetail }: QuickViewModalProps) {
  const [colorIndex, setColorIndex] = useState(0)
  const color = product.colors[Math.min(colorIndex, product.colors.length - 1)] ?? product.colors[0]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

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
          <ProductGallery
            product={product}
            colorIndex={colorIndex}
            containerClassName="relative h-[46dvh] w-full overflow-hidden bg-white/80 sm:h-[52dvh]"
          />
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
