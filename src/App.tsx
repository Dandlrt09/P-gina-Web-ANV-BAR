import { useEffect, useState } from 'react'
import { PRODUCTS, type Product } from './data/catalog'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { TrustBar } from './components/TrustBar'
import { FeaturedPiece } from './components/FeaturedPiece'
import { FeaturedCarousel } from './components/FeaturedCarousel'
import { ProductGrid } from './components/ProductGrid'
import { FavoritesPage } from './components/FavoritesPage'
import { QuickViewModal } from './components/QuickViewModal'
import { ProductDetail } from './components/ProductDetail'
import { Designer } from './components/Designer'
import { Exclusivity } from './components/Exclusivity'
import { Testimonials } from './components/Testimonials'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { LikesProvider } from './lib/LikesContext'
import { useLikes } from './lib/likes'
import { Reveal } from './lib/Reveal'

type View = 'home' | 'favorites' | 'product'

type Route = {
  view: View
  /** ID del producto cuando view === 'product'. */
  productId: string | null
}

/** La vista vive en el hash de la URL para que back/forward y recarga
 *  funcionen como en una navegación real, sin agregar un router.
 *  #/producto/<id> → ficha de producto; #/favoritos → favoritos;
 *  el resto (incluido #catalogo) → home. */
function routeFromHash(): Route {
  const hash = window.location.hash
  const match = hash.match(/^#\/producto\/([^/]+)$/)
  if (match) {
    try {
      return { view: 'product', productId: decodeURIComponent(match[1]) }
    } catch {
      return { view: 'product', productId: match[1] }
    }
  }
  if (hash.startsWith('#/favoritos')) return { view: 'favorites', productId: null }
  return { view: 'home', productId: null }
}

function Shop() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [quickView, setQuickView] = useState<Product | null>(null)
  const { likes } = useLikes()

  // Back/forward del navegador: el hash cambia → sincronizamos la vista.
  useEffect(() => {
    const onHashChange = () => {
      const next = routeFromHash()
      setRoute(next)
      const hash = window.location.hash
      if (next.view === 'favorites' || next.view === 'product') {
        window.scrollTo({ top: 0 })
      } else if (hash === '' || hash === '#/') {
        // Rutas sin ancla ('' o '#/'): arriba de la home.
        window.scrollTo({ top: 0 })
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Abre la ficha completa: navegación real por hash (#/producto/<id>).
  const openDetail = (product: Product) => {
    setQuickView(null)
    setRoute({ view: 'product', productId: product.id })
    window.location.hash = '/producto/' + product.id
  }

  const goToFavorites = () => {
    setQuickView(null)
    setRoute({ view: 'favorites', productId: null })
    window.location.hash = '/favoritos'
    window.scrollTo({ top: 0 })
  }

  const goHome = () => {
    setQuickView(null)
    setRoute({ view: 'home', productId: null })
    window.location.hash = '/'
    window.scrollTo({ top: 0 })
  }

  // Vuelve al catálogo (home) con scroll a la sección #catalogo.
  const goBackToCatalog = () => {
    setRoute({ view: 'home', productId: null })
    window.location.hash = 'catalogo'
    setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  const product =
    route.view === 'product' && route.productId
      ? (PRODUCTS.find((item) => item.id === route.productId) ?? null)
      : null

  const featured = PRODUCTS.filter((p) => p.isNew).sort((a, b) =>
    (b.addedAt ?? '').localeCompare(a.addedAt ?? ''),
  )

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-ink">
      <Nav favoritesCount={likes.size} onGoToFavorites={goToFavorites} onGoHome={goHome} />
      <main className="flex-1">
        {route.view === 'favorites' ? (
          <FavoritesPage
            onQuickView={setQuickView}
            onOpenDetail={openDetail}
            onBackToCatalog={goBackToCatalog}
          />
        ) : route.view === 'product' && product ? (
          <ProductDetail key={product.id} product={product} onBackToCatalog={goBackToCatalog} />
        ) : (
          <>
            <Hero />
            <TrustBar />
            <Reveal>
              <FeaturedPiece products={featured} onQuickView={setQuickView} />
            </Reveal>
            <FeaturedCarousel
              products={featured}
              onQuickView={setQuickView}
              onOpenDetail={openDetail}
            />
            <ProductGrid onQuickView={setQuickView} onOpenDetail={openDetail} />
            <Reveal>
              <Designer />
            </Reveal>
            <Reveal delay={100}>
              <Exclusivity />
            </Reveal>
            <Reveal delay={200}>
              <Testimonials />
            </Reveal>
            <Reveal delay={300}>
              <Contact />
            </Reveal>
          </>
        )}
      </main>
      <Footer />
      {quickView && (
        <QuickViewModal
          product={quickView}
          onClose={() => setQuickView(null)}
          onOpenDetail={openDetail}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <LikesProvider>
      <Shop />
    </LikesProvider>
  )
}

export default App
