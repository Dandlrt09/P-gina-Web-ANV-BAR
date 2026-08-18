import { useState } from 'react'
import { formatCOP, type Product } from '../data/catalog'
import { Container } from './Container'
import { ProductGallery } from './ProductGallery'
import { OrderConfirmBlock } from './OrderConfirmBlock'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { ReviewSection } from './ReviewSection'

type ProductDetailProps = {
  product: Product
  /** Vuelve a la home con scroll a la sección #catalogo. */
  onBackToCatalog: () => void
}

const ORDER_BADGE = 'Bajo pedido 3-5 días'

/**
 * Ficha de producto a pantalla completa (view 'product', navegada por hash
 * #/producto/<id>), dentro del flujo de la página con Nav arriba y Footer
 * abajo. Tres capas:
 *  1. Voz editorial de la pieza.
 *  2. Datos técnicos (tela, cuidados, tallas) desde el data file.
 *  3. Selector de variantes de color reales + talla + cantidad, con la
 *     nota de contacto por WhatsApp y el aviso de envío 3-5 días.
 * "Confirmar pedido" abre wa.me con el mensaje prearmado y muestra el
 * bloque de confirmación con cómo consultar el pedido. Al final incluye
 * la sección de reviews con persistencia local.
 */
export function ProductDetail({ product, onBackToCatalog }: ProductDetailProps) {
  const [colorIndex, setColorIndex] = useState(0)
  const [size, setSize] = useState(product.sizes[0] ?? 'Único')
  const [quantity, setQuantity] = useState(1)
  const [confirmed, setConfirmed] = useState(false)

  const color =
    product.colors[Math.min(colorIndex, product.colors.length - 1)] ?? product.colors[0]

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
    <section aria-label={`Ficha de ${product.name}`} className="py-10 sm:py-14">
      <Container>
        <button
          type="button"
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary transition-colors hover:text-brand-deep"
        >
          <span aria-hidden="true">←</span>
          Volver al catálogo
        </button>

        <div className="mt-8 grid items-start gap-10 md:grid-cols-2 md:gap-14">
          {/* Galería editorial a pantalla completa: área adaptada a la
              relación real de la foto + miniaturas debajo de la principal */}
          <ProductGallery product={product} colorIndex={colorIndex} mode="thumbnails" />

          {/* Información + selector */}
          <div>
            <div className="flex flex-wrap gap-2">
              {product.isNew && (
                <span className="rounded-full bg-brand-deep/90 px-3 py-1 text-xs font-medium text-surface">
                  Novedad
                </span>
              )}
              <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primary">
                {ORDER_BADGE}
              </span>
            </div>

            <p className="mt-5 text-xs uppercase tracking-[0.2em] text-accent">
              {product.category}
            </p>
            <h1 className="mt-2 font-display text-4xl font-medium leading-[1.1] text-brand-deep sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-3 font-display text-2xl font-medium text-brand-primary sm:text-3xl">
              {formatCOP(product.priceCOP)}
            </p>
            <p className="mt-1 text-sm text-brand-primary/80">
              Tu envío está programado: 3 a 5 días máximo
            </p>

            {confirmed ? (
              <div className="mt-8">
                <p className="text-sm leading-relaxed text-ink/80">
                  Tu pedido quedó enviado por WhatsApp. Anays te escribirá a este contacto para
                  coordinar la talla, el ajuste y la entrega.
                </p>
                <div className="mt-4">
                  <OrderConfirmBlock />
                </div>
                <button
                  type="button"
                  onClick={onBackToCatalog}
                  className="mt-4 w-full rounded-full bg-brand-deep py-3 text-sm font-medium text-surface transition-colors hover:bg-brand-primary sm:w-auto sm:px-8"
                >
                  Seguir comprando
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-8">
                {/* Capa 1: voz editorial */}
                <section aria-labelledby={`editorial-${product.id}`}>
                  <h2
                    id={`editorial-${product.id}`}
                    className="border-b border-brand-primary/15 pb-2 font-display text-lg font-medium text-brand-deep"
                  >
                    La pieza
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink/80">{product.editorial}</p>
                </section>

                {/* Capa 2: datos técnicos */}
                <section aria-labelledby={`tecnica-${product.id}`}>
                  <h2
                    id={`tecnica-${product.id}`}
                    className="border-b border-brand-primary/15 pb-2 font-display text-lg font-medium text-brand-deep"
                  >
                    Datos técnicos
                  </h2>
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
                  <h2
                    id={`seleccion-${product.id}`}
                    className="border-b border-brand-primary/15 pb-2 font-display text-lg font-medium text-brand-deep"
                  >
                    Elige tu pedido
                  </h2>

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

        <ReviewSection product={product} />
      </Container>
    </section>
  )
}
