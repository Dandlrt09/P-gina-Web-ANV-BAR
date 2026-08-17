import { useEffect, useState } from 'react'
import { formatCOP, type Product } from '../data/catalog'
import { ProductImage } from './ProductImage'
import { OrderConfirmBlock } from './OrderConfirmBlock'
import { buildWhatsAppLink } from '../lib/whatsapp'

type ProductDetailProps = {
  product: Product
  onClose: () => void
}

/**
 * Ficha de producto en tres capas:
 *  1. Voz editorial de la pieza.
 *  2. Datos técnicos (tela, cuidados, tallas) desde el data file.
 *  3. Selector de variantes de color reales + talla + cantidad, con la
 *     nota de contacto por WhatsApp y el aviso de envío 3-5 días.
 *
 * Se abre como overlay/estado (SPA sin router) desde ProductCard o la
 * vista rápida. "Confirmar pedido" abre wa.me con el mensaje prearmado y
 * muestra el bloque de confirmación con cómo consultar el pedido.
 */
export function ProductDetail({ product, onClose }: ProductDetailProps) {
  const [colorIndex, setColorIndex] = useState(0)
  const [size, setSize] = useState(product.sizes[0] ?? 'Único')
  const [quantity, setQuantity] = useState(1)
  const [confirmed, setConfirmed] = useState(false)

  const color =
    product.colors[Math.min(colorIndex, product.colors.length - 1)] ?? product.colors[0]

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

  const handleConfirm = () => {
    const link = buildWhatsAppLink({
      product: product.name,
      color: color.name,
      size,
      quantity,
    })
    window.open(link, '_blank', 'noopener,noreferrer')
    setConfirmed(true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha de ${product.name}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-negro/50 sm:items-center sm:p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="relative">
          <ProductImage
            image={color.image}
            alt={color.image?.label ?? product.name}
            className="aspect-[4/5] w-full"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface/90 text-lg text-brand-deep transition-colors hover:bg-surface"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">{product.category}</p>
          <h3 className="mt-1 font-display text-2xl font-medium text-brand-deep sm:text-3xl">
            {product.name}
          </h3>
          <p className="mt-1 text-lg font-semibold text-brand-primary">
            {formatCOP(product.priceCOP)}
          </p>
          <p className="mt-1 text-sm text-brand-primary/80">
            Tu envío está programado: 3 a 5 días máximo
          </p>

          {confirmed ? (
            <div className="mt-6">
              <p className="text-sm leading-relaxed text-ink/80">
                Tu pedido quedó enviado por WhatsApp. Anays te escribirá a este contacto para
                coordinar la talla, el ajuste y la entrega.
              </p>
              <div className="mt-4">
                <OrderConfirmBlock />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full rounded-full bg-brand-deep py-3 text-sm font-medium text-surface transition-colors hover:bg-brand-primary"
              >
                Seguir comprando
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-7">
              {/* Capa 1: voz editorial */}
              <section aria-labelledby={`editorial-${product.id}`}>
                <h4
                  id={`editorial-${product.id}`}
                  className="border-b border-brand-primary/15 pb-2 font-display text-lg font-medium text-brand-deep"
                >
                  La pieza
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-ink/80">{product.editorial}</p>
              </section>

              {/* Capa 2: datos técnicos */}
              <section aria-labelledby={`tecnica-${product.id}`}>
                <h4
                  id={`tecnica-${product.id}`}
                  className="border-b border-brand-primary/15 pb-2 font-display text-lg font-medium text-brand-deep"
                >
                  Datos técnicos
                </h4>
                <dl className="mt-3 space-y-2 text-sm leading-relaxed text-ink/80">
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-medium text-brand-deep">Tela</dt>
                    <dd>{product.fabric}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-medium text-brand-deep">Cuidados</dt>
                    <dd>{product.care}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-medium text-brand-deep">Tallas</dt>
                    <dd>{product.sizes.join(' · ')}</dd>
                  </div>
                </dl>
              </section>

              {/* Capa 3: selector de color, talla y cantidad */}
              <section aria-labelledby={`seleccion-${product.id}`}>
                <h4
                  id={`seleccion-${product.id}`}
                  className="border-b border-brand-primary/15 pb-2 font-display text-lg font-medium text-brand-deep"
                >
                  Elige tu pedido
                </h4>

                <fieldset className="mt-4">
                  <legend className="text-sm font-medium text-brand-deep">Color</legend>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
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
                    <span className="text-sm text-ink/70">{color.name}</span>
                  </div>
                </fieldset>

                <fieldset className="mt-4">
                  <legend className="text-sm font-medium text-brand-deep">Talla</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.sizes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSize(option)}
                        aria-pressed={size === option}
                        className={`min-w-12 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          size === option
                            ? 'border-brand-primary bg-brand-primary text-surface'
                            : 'border-brand-primary/30 text-brand-deep hover:border-brand-primary/60'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-4">
                  <p className="text-sm font-medium text-brand-deep">Cantidad</p>
                  <div className="mt-2 inline-flex items-center rounded-full border border-brand-primary/30">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      aria-label="Reducir cantidad"
                      className="grid size-9 place-items-center text-lg text-brand-deep transition-colors hover:text-brand-primary"
                    >
                      −
                    </button>
                    <output className="w-10 text-center text-sm font-semibold text-brand-deep">
                      {quantity}
                    </output>
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.min(9, value + 1))}
                      aria-label="Aumentar cantidad"
                      className="grid size-9 place-items-center text-lg text-brand-deep transition-colors hover:text-brand-primary"
                    >
                      +
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-ink/70">
                  Te contactamos por WhatsApp para talla y ajuste.
                </p>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="mt-5 w-full rounded-full bg-brand-primary py-3 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
                >
                  Confirmar pedido por WhatsApp
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}