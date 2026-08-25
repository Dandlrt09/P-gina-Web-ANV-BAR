import { useEffect, useState } from 'react'
import { PRODUCTS, compareCatalogOrder, type Product } from '../catalog/catalog'
import { Nav } from '../storefront/Nav'
import { Hero } from '../storefront/Hero'
import { TrustBar } from '../storefront/TrustBar'
import { FeaturedPiece } from '../catalog/FeaturedPiece'
import { FeaturedCarousel } from '../catalog/FeaturedCarousel'
import { ProductGrid } from '../catalog/ProductGrid'
import { FavoritesPage } from '../favorites/FavoritesPage'
import { QuickViewModal } from '../catalog/QuickViewModal'
import { ProductDetail } from '../catalog/ProductDetail'
import { Designer } from '../storefront/Designer'
import { Exclusivity } from '../storefront/Exclusivity'
import { Testimonials } from '../storefront/Testimonials'
import { Contact } from '../storefront/Contact'
import { Footer } from '../storefront/Footer'
import { ChatWidget } from '../chat/ChatWidget'
import { LikesProvider } from '../favorites/LikesContext'
import { AuthProvider } from '../admin/AuthContext'
import { CatalogProvider } from '../catalog/CatalogContext'
import { useCatalog } from '../catalog/catalog-context'
import { useLikes } from '../favorites/likes'
import { CatalogError, CatalogLoading } from '../catalog/CatalogGate'
import { AdminApp } from '../admin/AdminApp'
import { RecoveryPage } from '../admin/RecoveryPage'
import { Reveal } from '../shared/Reveal'

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

/** True cuando el hash apunta a la recuperación de contraseña (#/recovery).
 *  El link PKCE del correo llega con el code en el query y este fragment
 *  intacto, así que la app renderiza la página sin depender de la sesión. */
function isRecoveryHash(): boolean {
  return window.location.hash.startsWith('#/recovery')
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

  // Document title follows the route (resolved BEFORE the catalog gate so
  // this hook stays unconditional). Product tabs show the piece name, which
  // matters once several tabs or shared links are in play.
  const titleProduct =
    route.view === 'product' && route.productId
      ? (PRODUCTS.find((item) => item.id === route.productId) ?? null)
      : null
  useEffect(() => {
    document.title = titleProduct
      ? `${titleProduct.name} · ANV·BAR`
      : route.view === 'favorites'
        ? 'Tus favoritos · ANV·BAR'
        : 'ANV·BAR — moda femenina hecha a mano'
  }, [route.view, titleProduct])

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

  // El quick view guarda un snapshot; se resuelve por id en cada render para
  // que los refrescos realtime del catálogo muestren datos frescos y un
  // producto borrado simplemente cierre el modal.
  const quickViewProduct = quickView
    ? (PRODUCTS.find((item) => item.id === quickView.id) ?? null)
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
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickView(null)}
          onOpenDetail={openDetail}
        />
      )}
      <ChatWidget />
    </div>
  )
}

type AppBranch = 'admin' | 'recovery' | 'shop'

function App() {
  const [branch, setBranch] = useState<AppBranch>(() => {
    if (isAdminHash()) return 'admin'
    if (isRecoveryHash()) return 'recovery'
    return 'shop'
  })

  useEffect(() => {
    const onHashChange = () => {
      if (isAdminHash()) setBranch('admin')
      else if (isRecoveryHash()) setBranch('recovery')
      else setBranch('shop')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Raíz: AuthProvider gobierna todas las ramas. El admin y la recuperación
  // renderizan sin tocar el fetch del catálogo (el gate nunca los bloquea);
  // al volver a la tienda la rama pública se remonta entera y el próximo
  // fetch trae lo recién salvado.
  return (
    <AuthProvider>
      {branch === 'admin' ? (
        <AdminApp />
      ) : branch === 'recovery' ? (
        <RecoveryPage />
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
