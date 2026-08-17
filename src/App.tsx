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

type View = 'home' | 'favorites'

/** La vista vive en el hash de la URL para que back/forward y recarga
 *  funcionen como en una navegación real, sin agregar un router. */
function viewFromHash(): View {
  return window.location.hash.startsWith('#/favoritos') ? 'favorites' : 'home'
}

function Shop() {
  const [view, setView] = useState<View>(viewFromHash)
  const [quickView, setQuickView] = useState<Product | null>(null)
  const [detail, setDetail] = useState<Product | null>(null)
  const { likes } = useLikes()

  // Back/forward del navegador: el hash cambia → sincronizamos la vista.
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      if (hash.startsWith('#/favoritos')) {
        setView('favorites')
        window.scrollTo({ top: 0 })
      } else {
        setView('home')
        // Rutas sin ancla ('' o '#/'): arriba de la home.
        if (hash === '' || hash === '#/') window.scrollTo({ top: 0 })
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const openDetail = (product: Product) => {
    setQuickView(null)
    setDetail(product)
  }

  const goToFavorites = () => {
    setDetail(null)
    setQuickView(null)
    setView('favorites')
    window.location.hash = '/favoritos'
    window.scrollTo({ top: 0 })
  }

  const goHome = () => {
    setDetail(null)
    setQuickView(null)
    setView('home')
    window.location.hash = '/'
    window.scrollTo({ top: 0 })
  }

  const goBackToCatalog = () => {
    setView('home')
    window.location.hash = 'catalogo'
    setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  const featured = PRODUCTS.filter((p) => p.isNew).sort((a, b) =>
    (b.addedAt ?? '').localeCompare(a.addedAt ?? ''),
  )

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-ink">
      <Nav favoritesCount={likes.size} onGoToFavorites={goToFavorites} onGoHome={goHome} />
      <main className="flex-1">
        {view === 'favorites' ? (
          <FavoritesPage
            onQuickView={setQuickView}
            onOpenDetail={openDetail}
            onBackToCatalog={goBackToCatalog}
          />
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
      {detail && <ProductDetail product={detail} onClose={() => setDetail(null)} />}
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