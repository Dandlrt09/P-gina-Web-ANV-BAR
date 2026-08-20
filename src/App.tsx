import { useEffect, useState } from 'react'
import { PRODUCTS, compareCatalogOrder, type Product } from './data/catalog'
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
import { ChatWidget } from './components/ChatWidget'
import { LikesProvider } from './lib/LikesContext'
import { AuthProvider } from './lib/AuthContext'
import { CatalogProvider } from './lib/CatalogContext'
import { useCatalog } from './lib/catalog-context'
import { useLikes } from './lib/likes'
import { CatalogError, CatalogLoading } from './components/CatalogGate'
import { AdminApp } from './components/admin/AdminApp'
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

/** True cuando el hash apunta al admin (#/admin, #/admin/...). Se evalúa
 *  ANTES del gate del catálogo: el panel nunca espera el fetch. */
function isAdminHash(): boolean {
  return window.location.hash.startsWith('#/admin')
}

function Shop() {
  const [route, setRoute] = useState<Route>(routeFromHash)
  const [quickView, setQuickView] = useState<Product | null>(null)
  const { likes } = useLikes()
  const { status, retry } = useCatalog()

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

  // Gate del catálogo: mientras la carga no termina NO resolvemos rutas.
  // La pantalla de carga (o de error) reemplaza TODO el contenido, así el
  // grid y los vacíos "El catálogo se está vistiendo"/"Próximamente" jamás
  // parpadean, y #/producto/<id desconocido> no cae a la home en silencio.
  if (status === 'loading') return <CatalogLoading />
  if (status === 'error') return <CatalogError onRetry={retry} />

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

  const featured = PRODUCTS.filter((p) => p.isNew).sort(compareCatalogOrder)

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
      <ChatWidget />
    </div>
  )
}

function App() {
  const [isAdmin, setIsAdmin] = useState(isAdminHash)

  useEffect(() => {
    const onHashChange = () => setIsAdmin(isAdminHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Raíz: AuthProvider gobierna ambas ramas. El admin renderiza sin tocar el
  // fetch del catálogo (el gate nunca lo bloquea); al volver a la tienda la
  // rama pública se remonta entera y el próximo fetch trae lo recién salvado.
  return (
    <AuthProvider>
      {isAdmin ? (
        <AdminApp />
      ) : (
        <LikesProvider>
          <CatalogProvider>
            <Shop />
          </CatalogProvider>
        </LikesProvider>
      )}
    </AuthProvider>
  )
}

export default App
