import { useState } from 'react'
import { CATEGORIES, PRODUCTS, type Product, type ProductCategory } from '../data/catalog'
import { Container } from './Container'
import { ProductCard } from './ProductCard'
import { Reveal } from '../lib/Reveal'

type ProductGridProps = {
  onQuickView: (product: Product) => void
  onOpenDetail: (product: Product) => void
}

/**
 * Catálogo por categorías: las siete categorías como secciones en una sola
 * página continua. Las píldoras filtran una categoría a la vez (single
 * select): click en una píldora la resalta y muestra solo esa categoría;
 * click de nuevo en la misma la desactiva y vuelve el catálogo completo.
 * Los favoritos viven en su pantalla dedicada (FavoritesPage).
 */
export function ProductGrid({ onQuickView, onOpenDetail }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(null)

  const toggleCategory = (category: ProductCategory) => {
    setActiveCategory((current) => (current === category ? null : category))
  }

  const visibleCategories = activeCategory ? [activeCategory] : CATEGORIES

  return (
    <section id="catalogo" className="scroll-mt-20">
      <Container className="py-14 sm:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Todo a la vista
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium text-brand-deep sm:text-4xl">
            El catálogo
          </h2>
          <p className="mt-3 text-ink/80">
            Cada pieza se hace a mano después de tu pedido, por eso llega a tu puerta en un máximo
            de cinco días.
          </p>
        </div>

        {/* Filtro por categoría: un solo click a la vez, mismo click para quitar */}
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filtrar el catálogo por categoría">
          {CATEGORIES.map((category) => {
            const isActive = category === activeCategory
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                aria-pressed={isActive}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${
                  isActive
                    ? 'border-brand-primary bg-brand-primary text-surface'
                    : 'border-brand-primary/25 bg-transparent text-brand-deep hover:border-brand-primary/60 hover:bg-brand-primary/5'
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>

        <div className="mt-12 space-y-14">
          {visibleCategories.map((category) => {
            const items = PRODUCTS.filter((product) => product.category === category)
            return (
              <section key={category} aria-labelledby={`seccion-${category}`}>
                <h3
                  id={`seccion-${category}`}
                  className="border-b border-brand-primary/15 pb-3 font-display text-xl font-medium text-brand-primary"
                >
                  {category}
                </h3>
                <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((product, index) => (
                    <Reveal key={product.id} delay={(index % 4) * 75} className="h-full">
                      <ProductCard
                        product={product}
                        onQuickView={onQuickView}
                        onOpenDetail={onOpenDetail}
                      />
                    </Reveal>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </Container>
    </section>
  )
}