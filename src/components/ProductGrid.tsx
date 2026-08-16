import { CATEGORIES, PRODUCTS, type Product } from '../data/catalog'
import { Container } from './Container'
import { ProductCard } from './ProductCard'
import { useLikes } from '../lib/likes'

type ProductGridProps = {
  onQuickView: (product: Product) => void
  onOpenDetail: (product: Product) => void
}

/**
 * Catálogo "todo a la vista": las siete categorías como secciones en una
 * sola página continua, sin menú desplegable. Con "Tus favoritos" activo
 * solo se muestran las piezas guardadas (filtro funcional, spec likes).
 */
export function ProductGrid({ onQuickView, onOpenDetail }: ProductGridProps) {
  const { likes, favoritesOnly, toggleFavorites } = useLikes()

  const sections = favoritesOnly
    ? CATEGORIES.filter((category) =>
        PRODUCTS.some((product) => product.category === category && likes.has(product.id)),
      )
    : CATEGORIES

  return (
    <section id="catalogo" className="scroll-mt-20">
      <Container className="py-14 sm:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            {favoritesOnly ? 'Tus favoritos' : 'Todo a la vista'}
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium text-brand-deep sm:text-4xl">
            {favoritesOnly ? 'Lo que marcaste' : 'El catálogo'}
          </h2>
          <p className="mt-3 text-ink/80">
            {favoritesOnly
              ? 'Aquí solo aparecen las piezas que guardaste. Toca el corazón de una pieza para guardarla o quitarla.'
              : 'Cada pieza se hace a mano después de tu pedido, por eso llega a tu puerta en un máximo de cinco días.'}
          </p>
        </div>

        {favoritesOnly && likes.size === 0 ? (
          <div className="mt-12 rounded-xl border border-brand-primary/15 bg-white/60 p-10 text-center">
            <p className="text-3xl" aria-hidden="true">
              ♥
            </p>
            <h3 className="mt-4 font-display text-2xl font-medium text-brand-deep">
              Aún no tienes favoritos
            </h3>
            <p className="mx-auto mt-2 max-w-md text-ink/80">
              Explora el catálogo y toca el corazón en las piezas que te gusten. Tus guardados
              aparecerán aquí y se conservan al recargar la página.
            </p>
            <button
              type="button"
              onClick={toggleFavorites}
              className="mt-6 inline-flex rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="mt-12 space-y-14">
            {sections.map((category) => {
              const items = PRODUCTS.filter(
                (product) =>
                  product.category === category && (!favoritesOnly || likes.has(product.id)),
              )
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
        )}
      </Container>
    </section>
  )
}