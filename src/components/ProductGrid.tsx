import { CATEGORIES, PRODUCTS, type Product } from '../data/catalog'
import { Container } from './Container'
import { ProductCard } from './ProductCard'

type ProductGridProps = {
  onQuickView: (product: Product) => void
  onOpenDetail: (product: Product) => void
}

/**
 * Catálogo "todo a la vista": las siete categorías como secciones
 * en una sola página continua, sin menú desplegable de categorías.
 */
export function ProductGrid({ onQuickView, onOpenDetail }: ProductGridProps) {
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
            Cada pieza se hace a mano después de tu pedido, por eso llega a tu
            puerta en un máximo de cinco días.
          </p>
        </div>

        <div className="mt-12 space-y-14">
          {CATEGORIES.map((category) => {
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
                  {items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onQuickView={onQuickView}
                      onOpenDetail={onOpenDetail}
                    />
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