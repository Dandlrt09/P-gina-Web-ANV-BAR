import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { AdminLogin } from './AdminLogin'
import { ProductList } from './ProductList'
import { ProductForm } from './ProductForm'
import { ImportProducts } from './ImportProducts'
import { ContactChannelsManager } from './ContactChannelsManager'

/**
 * Admin internal routes (hash-based, same conventions as the storefront).
 *   #/admin                          → panel (dashboard)
 *   #/admin/login                    → login (rendered by the signedOut gate)
 *   #/admin/productos                → product list
 *   #/admin/productos/nuevo          → create product
 *   #/admin/productos/<id>           → edit product
 *   #/admin/importar                 → spreadsheet bulk import
 *   #/admin/contacto                 → contact channels manager
 */
type AdminRoute =
  | { view: 'dashboard' }
  | { view: 'productos' }
  | { view: 'nuevo' }
  | { view: 'producto'; id: string }
  | { view: 'importar' }
  | { view: 'contacto' }

function routeFromAdminHash(): AdminRoute {
  const hash = window.location.hash
  const productMatch = hash.match(/^#\/admin\/productos\/(.+)$/)
  if (productMatch) {
    let id = productMatch[1]
    try {
      id = decodeURIComponent(id)
    } catch {
      /* hash mal codificado: usar el patron crudo y no romper el routeo */
    }
    return id === 'nuevo' ? { view: 'nuevo' } : { view: 'producto', id }
  }
  if (hash.startsWith('#/admin/productos')) return { view: 'productos' }
  if (hash.startsWith('#/admin/importar')) return { view: 'importar' }
  if (hash.startsWith('#/admin/contacto')) return { view: 'contacto' }
  return { view: 'dashboard' }
}

function AdminLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface font-sans text-ink">
      <div role="status" className="flex flex-col items-center gap-6 text-center">
        <p className="font-display text-2xl font-semibold tracking-wide text-brand-deep">ANV·BAR</p>
        <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary/50" />
        <span className="sr-only">Verificando la sesión…</span>
      </div>
    </div>
  )
}

function AdminDenied() {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.hash = '/admin/login'
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 font-sans text-ink">
      <div className="w-full max-w-md rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">ANV·BAR</p>
        <h1 className="mt-4 font-display text-3xl font-medium text-brand-deep sm:text-4xl">
          No autorizado
        </h1>
        <p className="mt-4 text-ink/80">
          Esta cuenta no tiene permisos para administrar el catálogo. No se muestra ningún dato
          administrativo.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full bg-brand-primary px-7 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
          >
            Cerrar sesión
          </button>
          <a
            href="#/"
            className="rounded-full border border-brand-primary/40 px-7 py-2.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
          >
            Volver a la tienda
          </a>
        </div>
      </div>
    </div>
  )
}

function AdminDashboard() {
  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-medium text-brand-deep sm:text-3xl">
          Panel de administración
        </h1>
        <p className="mt-2 text-ink/80">
          Gestione productos, fotos y canales de contacto de la tienda. Todo cambio se publica solo.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="#/admin/productos"
            className="rounded-xl border border-brand-primary/15 bg-white/60 p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/10 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <h2 className="font-display text-lg text-brand-deep">Productos</h2>
            <p className="mt-1 text-sm text-ink/80">
              Ver, crear, editar y eliminar productos del catálogo.
            </p>
          </a>
          <a
            href="#/admin/productos/nuevo"
            className="rounded-xl border border-brand-primary/15 bg-white/60 p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/10 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <h2 className="font-display text-lg text-brand-deep">Nuevo producto</h2>
            <p className="mt-1 text-sm text-ink/80">
              Crear una pieza con variantes de color y fotos subidas a Supabase Storage.
            </p>
          </a>
          <a
            href="#/admin/importar"
            className="rounded-xl border border-brand-primary/15 bg-white/60 p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/10 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <h2 className="font-display text-lg text-brand-deep">Importar productos</h2>
            <p className="mt-1 text-sm text-ink/80">
              Cargue varias piezas a la vez desde una planilla (Excel/CSV), con fotos por URL.
            </p>
          </a>
          <a
            href="#/admin/contacto"
            className="rounded-xl border border-brand-primary/15 bg-white/60 p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/10 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <h2 className="font-display text-lg text-brand-deep">Contacto</h2>
            <p className="mt-1 text-sm text-ink/80">
              Gestione los canales de contacto que se muestran en la tienda.
            </p>
          </a>
          <a
            href="#/"
            className="rounded-xl border border-brand-primary/15 bg-white/60 p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/10 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <h2 className="font-display text-lg text-brand-deep">Ver la tienda</h2>
            <p className="mt-1 text-sm text-ink/80">Volver al sitio público.</p>
          </a>
        </div>
      </div>
    </section>
  )
}

function AdminPanel() {
  const { email, signOut } = useAuth()
  const [route, setRoute] = useState<AdminRoute>(routeFromAdminHash)

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromAdminHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    window.location.hash = '/admin/login'
  }

  const navLink = (href: string, label: string, active: boolean) => (
    <a
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-brand-primary text-surface' : 'text-brand-deep hover:bg-brand-primary/10'
      }`}
    >
      {label}
    </a>
  )

  return (
    <div className="flex min-h-screen flex-col bg-surface font-sans text-ink">
      <header className="sticky top-0 z-40 border-b border-brand-primary/20 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#/admin" className="font-display text-xl font-semibold tracking-wide text-brand-deep">
            ANV·BAR <span className="text-accent">— Administración</span>
          </a>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink/70 sm:inline">{email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-brand-primary/40 px-4 py-1.5 font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 pb-3 no-scrollbar sm:px-6 lg:px-8">
          {navLink('#/admin', 'Panel', route.view === 'dashboard')}
          {navLink('#/admin/productos', 'Productos', route.view === 'productos')}
          {navLink('#/admin/productos/nuevo', 'Nuevo producto', route.view === 'nuevo')}
          {navLink('#/admin/importar', 'Importar', route.view === 'importar')}
          {navLink('#/admin/contacto', 'Contacto', route.view === 'contacto')}
        </nav>
      </header>
      <main className="flex-1">
        {route.view === 'productos' ? (
          <ProductList />
        ) : route.view === 'nuevo' ? (
          <ProductForm mode="create" />
        ) : route.view === 'producto' ? (
          <ProductForm mode="edit" productId={route.id} />
        ) : route.view === 'importar' ? (
          <ImportProducts />
        ) : route.view === 'contacto' ? (
          <ContactChannelsManager />
        ) : (
          <AdminDashboard />
        )}
      </main>
      <footer className="border-t border-brand-primary/10 py-6">
        <div className="mx-auto w-full max-w-6xl px-4 text-center text-xs text-ink/60 sm:px-6 lg:px-8">
          ANV·BAR — panel de administración
        </div>
      </footer>
    </div>
  )
}

/**
 * Gate del admin (CR-AD-02 / SC-AD-*).
 *   1. loading   → loader de sesión
 *   2. signedOut → login (nunca datos)
 *   3. denied    → pantalla sin datos (sesión no allowlist)
 *   4. ok        → panel
 * Si no hay sesión o la cuenta no está en la allowlist, no se renderiza nada
 * del catálogo: el gate prohíbe todo antes de montar las herramientas.
 */
export function AdminApp() {
  const { status } = useAuth()

  if (status === 'loading') return <AdminLoader />
  if (status === 'signedOut') return <AdminLogin />
  if (status === 'denied') return <AdminDenied />
  return <AdminPanel />
}