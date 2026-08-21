import { PRODUCTS, type Product } from '../catalog/catalog'
import { Container } from '../shared/Container'
import { ProductCard } from '../catalog/ProductCard'
import { Reveal } from '../shared/Reveal'
import { useLikes } from './likes'

type FavoritesPageProps = {
  onQuickView: (product: Product) => void
  onOpenDetail: (product: Product) => void
  onBackToCatalog: () => void
}

/**
 * Pantalla dedicada de favoritos: muestra las piezas guardadas en una
 * vista separada de la home. Está siempre accesible desde el Nav y no
 * filtra el catálogo principal.
 */
export function FavoritesPage({ onQuickView, onOpenDetail, onBackToCatalog }: FavoritesPageProps) {
  const { likes } = useLikes()
  const favorites = PRODUCTS.filter((product) => likes.has(product.id))

  return (
    <section id="favoritos" className="scroll-mt-20">
      <Container className="py-14 sm:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            ✦ Lo que guardaste
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium text-brand-deep sm:text-4xl">
            Tus favoritos
          </h2>
          <p className="mt-3 text-ink/80">
            Las piezas que marcaste con el corazón, reunidas aquí para que las tengas a la mano.
          </p>
        </div>

        {favorites.length === 0 ? (
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
              onClick={onBackToCatalog}
              className="mt-6 inline-flex rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favorites.map((product, index) => (
                <Reveal key={product.id} delay={(index % 4) * 75} className="h-full">
                  <ProductCard
                    product={product}
                    onQuickView={onQuickView}
                    onOpenDetail={onOpenDetail}
                  />
                </Reveal>
              ))}
            </div>
            <div className="mt-14 text-center">
              <button
                type="button"
                onClick={onBackToCatalog}
                className="inline-flex rounded-full border border-brand-primary/40 px-6 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface"
              >
                Volver al catálogo
              </button>
            </div>
          </>
        )}
      </Container>
    </section>
  )
}