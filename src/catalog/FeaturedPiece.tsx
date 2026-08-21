import { useEffect, useRef, useState } from 'react'
import { formatCOP, type Product } from './catalog'
import { Container } from '../shared/Container'
import { ProductImage } from './ProductImage'

const ROTATE_MS = 6000
const FADE_MS = 350

type FeaturedPieceProps = {
  /** Novedades a rotar (ordenadas, más reciente primero). */
  products: Product[]
  /** Abre la vista rápida de la prenda activa. */
  onQuickView: (product: Product) => void
}

/**
 * Sección editorial "pieza estrella": rota automáticamente entre las
 * novedades con un fundido (fade out / fade in), pausa al pasar el mouse,
 * flechas ‹ › para navegar y dots para ir directo a una prenda.
 * Respeta prefers-reduced-motion: sin autoplay ni fundido en ese caso.
 */
export function FeaturedPiece({ products, onQuickView }: FeaturedPieceProps) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [paused, setPaused] = useState(false)
  const indexRef = useRef(0)
  const fadeTimeoutRef = useRef<number | undefined>(undefined)
  const reducedRef = useRef(false)

  // prefers-reduced-motion: desactiva autoplay y fundido (accesibilidad).
  useEffect(() => {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }, [])

  // Autoplay: cada ROTATE_MS avanza, salvo pausa por hover o reduced-motion.
  useEffect(() => {
    if (products.length <= 1) return
    const id = window.setInterval(() => {
      if (!paused && !reducedRef.current) {
        goTo(indexRef.current + 1)
      }
    }, ROTATE_MS)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, products.length])

  // Limpia el timeout de fade al desmontar.
  useEffect(() => () => window.clearTimeout(fadeTimeoutRef.current), [])

  if (products.length === 0) return null

  const goTo = (next: number) => {
    const count = products.length
    if (count <= 1) return
    const target = ((next % count) + count) % count
    if (target === indexRef.current) return
    window.clearTimeout(fadeTimeoutRef.current)
    setVisible(false)
    fadeTimeoutRef.current = window.setTimeout(() => {
      indexRef.current = target
      setIndex(target)
      setVisible(true)
    }, reducedRef.current ? 0 : FADE_MS)
  }

  const product = products[index]
  const primary = product.colors[0]
  const img = primary?.image
  const alt = img?.label ?? product.name

  return (
    <section
      className="border-b border-brand-primary/10 bg-white/40"
      aria-labelledby="pieza-estrella-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Container className="py-14 sm:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* Imagen con controles flotantes */}
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <div
                className={`h-full w-full transition-opacity duration-300 motion-reduce:transition-none ${
                  visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <ProductImage
                  image={img}
                  alt={alt}
                  className="h-full w-full"
                />
              </div>
              {product.isNew && (
                <span className="absolute left-3 top-3 rounded-full bg-brand-deep/90 px-3 py-1 text-xs font-medium text-surface">
                  Novedad
                </span>
              )}
            </div>

            {/* Flechas ‹ › */}
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Prenda anterior"
              className="absolute -left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-brand-primary/20 bg-surface/95 text-brand-primary shadow-sm transition-colors hover:bg-brand-primary hover:text-surface motion-reduce:transition-none"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Prenda siguiente"
              className="absolute -right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-brand-primary/20 bg-surface/95 text-brand-primary shadow-sm transition-colors hover:bg-brand-primary hover:text-surface motion-reduce:transition-none"
            >
              ›
            </button>
          </div>

          {/* Contenido de la prenda activa */}
          <div aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              ✦ La pieza de la colección
            </p>
            <h2
              id="pieza-estrella-title"
              className="mt-3 font-display text-4xl font-medium leading-[1.1] text-brand-deep sm:text-5xl"
            >
              {product.name}
            </h2>
            <p className="mt-5 max-w-xl text-ink/85">{product.editorial}</p>

            <div className="mt-8 border-t border-brand-primary/15 pt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-accent">{product.category}</p>
              <p className="mt-1 font-display text-3xl font-medium text-brand-primary">
                {formatCOP(product.priceCOP)}
              </p>
              <button
                type="button"
                onClick={() => onQuickView(product)}
                className="mt-5 inline-flex rounded-full bg-brand-primary px-7 py-3 text-sm font-semibold text-surface transition-colors hover:bg-brand-deep"
              >
                Descubrir la pieza
              </button>
            </div>

            {/* Dots + contador */}
            <div className="mt-6 flex items-center gap-2" role="group" aria-label="Navegación de la pieza estrella">
              {products.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Ir a ${item.name}`}
                  aria-current={i === index}
                  className={`size-2.5 rounded-full transition-colors motion-reduce:transition-none ${
                    i === index ? 'bg-brand-primary' : 'bg-brand-primary/25 hover:bg-brand-primary/50'
                  }`}
                />
              ))}
              <span className="ml-3 text-xs tabular-nums text-ink/60">
                {index + 1} / {products.length}
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}