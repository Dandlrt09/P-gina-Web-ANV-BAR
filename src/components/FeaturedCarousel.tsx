import { useEffect, useRef, useState } from 'react'
import type { Product } from '../data/catalog'
import { Container } from './Container'
import { ProductCard } from './ProductCard'
import { Reveal } from '../lib/Reveal'

type FeaturedCarouselProps = {
  products: Product[]
  onQuickView: (product: Product) => void
  onOpenDetail: (product: Product) => void
}

const SCROLL_STEP = 0.8

/**
 * Cinta horizontal de novedades: las piezas marcadas como nuevas por Anays
 * (flag `isNew`), en el orden determinístico del catálogo (identificador).
 * Se desplaza con flechas; en táctil también se desliza con el dedo.
 */
export function FeaturedCarousel({ products, onQuickView, onOpenDetail }: FeaturedCarouselProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const syncArrows = () => {
    const el = stripRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    syncArrows()
    window.addEventListener('resize', syncArrows)
    return () => window.removeEventListener('resize', syncArrows)
  }, [])

  const scrollByStep = (direction: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * SCROLL_STEP, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="novedades-title">
      <Container className="py-14 sm:py-20">
        <div className="relative">
          <div className="max-w-xl pr-24">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Recién llegados
            </p>
            <h2
              id="novedades-title"
              className="mt-3 font-display text-4xl font-medium text-brand-deep sm:text-5xl lg:text-6xl"
            >
              Novedades
            </h2>
            <p className="mt-3 text-ink/80">
              Lo último de la colección RUBRA, teñido de brisa y hecho a mano bajo pedido.
            </p>
          </div>

          <div className="absolute right-0 top-0 flex gap-2">
            <button
              type="button"
              onClick={() => scrollByStep(-1)}
              disabled={!canPrev}
              aria-label="Novedades anteriores"
              className="grid size-10 place-items-center rounded-full border border-brand-primary/20 text-2xl leading-none text-brand-primary transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => scrollByStep(1)}
              disabled={!canNext}
              aria-label="Novedades siguientes"
              className="grid size-10 place-items-center rounded-full border border-brand-primary/20 text-2xl leading-none text-brand-primary transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
            >
              ›
            </button>
          </div>
        </div>

        <div
          ref={stripRef}
          onScroll={syncArrows}
          className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:mt-10"
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className="w-[75%] shrink-0 snap-start sm:w-[45%] lg:w-[30%] xl:w-[23%]"
            >
              <Reveal delay={index * 60} className="h-full">
                <ProductCard product={product} onQuickView={onQuickView} onOpenDetail={onOpenDetail} />
              </Reveal>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}