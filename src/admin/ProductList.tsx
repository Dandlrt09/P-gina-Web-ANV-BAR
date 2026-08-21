import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CATEGORIES,
  compareCatalogOrder,
  formatCOP,
  type Product,
  type ProductCategory,
} from '../catalog/catalog'
import { deleteProduct, deleteProductImages, listAdminProducts } from './products'

/** Criterios de orden del listado. El default replica al catálogo público. */
type SortKey = 'catalogo' | 'nombre' | 'precio-asc' | 'precio-desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'catalogo', label: 'Orden del catálogo' },
  { value: 'nombre', label: 'Nombre A–Z' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
]

/**
 * Listado de productos del admin (ruta #/admin/productos).
 * Carga el catálogo desde Supabase y expone editar / eliminar. Al eliminar
 * borra el producto y limpia (best-effort) sus fotos bajo el path del id.
 * Filtros en cliente (categoría + orden), espejo de los del catálogo público:
 * el catálogo completo vive en memoria, filtrar acá no toca la red.
 */
export function ProductList() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mutating, setMutating] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'todas'>('todas')
  const [sortKey, setSortKey] = useState<SortKey>('catalogo')

  /** Lista visible según filtros; sin filtros es idéntica al fetch original. */
  const visible = useMemo(() => {
    const base = products ?? []
    const filtered =
      categoryFilter === 'todas' ? base : base.filter((product) => product.category === categoryFilter)
    const sorted = [...filtered]
    if (sortKey === 'nombre') sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    else if (sortKey === 'precio-asc') sorted.sort((a, b) => a.priceCOP - b.priceCOP)
    else if (sortKey === 'precio-desc') sorted.sort((a, b) => b.priceCOP - a.priceCOP)
    else sorted.sort(compareCatalogOrder)
    return sorted
  }, [products, categoryFilter, sortKey])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setProducts(await listAdminProducts())
    } catch (error) {
      setProducts(null)
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (product: Product) => {
    if (mutating) return
    if (!window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return
    setMutating(product.id)
    try {
      await deleteProduct(product.id)
      await deleteProductImages(product.id, product.colors)
      setProducts((prev) => (prev ?? []).filter((item) => item.id !== product.id))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    } finally {
      setMutating(null)
    }
  }

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium text-brand-deep sm:text-3xl">Productos</h1>
            <p className="mt-2 text-ink/80">
              Los cambios se publican en el catálogo en el próximo fetch (sin commit ni rebuild).
            </p>
          </div>
          <a
            href="#/admin/productos/nuevo"
            className="rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
          >
            + Nuevo producto
          </a>
        </div>

        {loadError && (
          <div role="alert" className="mt-6 rounded-xl border border-brand-primary/25 bg-white/60 p-5">
            <p className="font-medium text-brand-deep">No pudimos cargar los productos</p>
            <p className="mt-1 text-sm text-ink/80">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-full border border-brand-primary/40 px-6 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loadError && products === null && (
          <div role="status" className="mt-10 flex justify-center gap-3">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary/50" />
            <span className="text-sm text-ink/70">Cargando productos…</span>
          </div>
        )}

        {!loadError && products !== null && products.length === 0 && (
          <div className="mt-10 rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
            <p className="font-display text-lg text-brand-deep">Aún no hay productos</p>
            <p className="mt-1 text-sm text-ink/80">
              Cree la primera pieza y aparecerá en la tienda en el próximo fetch.
            </p>
            <a
              href="#/admin/productos/nuevo"
              className="mt-6 inline-block rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
            >
              + Nuevo producto
            </a>
          </div>
        )}

        {products !== null && products.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoría">
              {(['todas', ...CATEGORIES] as const).map((category) => {
                const active = categoryFilter === category
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter(category)}
                    aria-pressed={active}
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors motion-reduce:transition-none ${
                      active
                        ? 'border-brand-primary bg-brand-primary text-surface'
                        : 'border-brand-primary/30 bg-surface text-brand-deep hover:border-brand-primary/60'
                    }`}
                  >
                    {category === 'todas' ? 'Todas' : category}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="admin-sort" className="text-sm text-ink/70">
                Ordenar
              </label>
              <select
                id="admin-sort"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="rounded-full border border-brand-primary/30 bg-surface px-4 py-1.5 text-sm text-brand-deep outline-none transition-colors focus:border-brand-primary"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-xs tabular-nums text-ink/60">
                {visible.length} de {products.length}
              </span>
            </div>
          </div>
        )}

        {!loadError && products !== null && products.length > 0 && visible.length === 0 && (
          <div className="mt-10 rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
            <p className="font-display text-lg text-brand-deep">No hay productos en «{categoryFilter}»</p>
            <button
              type="button"
              onClick={() => setCategoryFilter('todas')}
              className="mt-5 rounded-full border border-brand-primary/40 px-6 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
            >
              Ver todas las categorías
            </button>
          </div>
        )}

        {!loadError && products !== null && products.length > 0 && visible.length > 0 && (
          <ul className="mt-8 flex flex-col gap-3">
            {visible.map((product) => {
              const firstColor = product.colors[0]
              return (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-primary/15 bg-white/60 p-4"
                >
                  {firstColor?.image?.src ? (
                    <img
                      src={firstColor.image.src}
                      alt={firstColor.image.label ?? product.name}
                      loading="lazy"
                      className="h-16 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-12 shrink-0 place-items-center rounded-lg bg-brand-primary/5 font-display text-xs italic text-brand-primary/70">
                      {firstColor?.image?.label ?? product.name}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg leading-snug text-brand-deep">{product.name}</h2>
                      {product.isNew && (
                        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                          Novedad
                        </span>
                      )}
                      {!CATEGORIES.includes(product.category) && (
                        <span
                          className="rounded-full bg-amber-200/70 px-2.5 py-0.5 text-xs font-medium text-amber-900"
                          title="Esta categoría ya no está en la lista vigente del catálogo"
                        >
                          Categoría no vigente
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-accent">
                      {product.category}
                    </p>
                    <p className="mt-1 text-sm text-ink/80">
                      {formatCOP(product.priceCOP)} · {product.sizes.join(', ')} ·{' '}
                      {product.colors.length} color{product.colors.length === 1 ? '' : 'es'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`#/admin/productos/${encodeURIComponent(product.id)}`}
                      className="rounded-full border border-brand-primary/40 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
                    >
                      Editar
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleDelete(product)}
                      disabled={mutating === product.id}
                      className="rounded-full border border-brand-primary/40 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {mutating === product.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}