import { createContext, useContext } from 'react'
import { supabase } from './supabase'
import {
  CATEGORIES,
  mapCategoryRow,
  mapProductRow,
  setCatalogProducts,
  type ProductRow,
} from '../data/catalog'

export type CatalogStatus = 'loading' | 'ready' | 'error'

export type CatalogContextValue = {
  status: CatalogStatus
  retry: () => void
}

export const CatalogContext = createContext<CatalogContextValue | null>(null)

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog debe usarse dentro de CatalogProvider')
  return ctx
}

/**
 * In-flight guard at module level: StrictMode mounts the provider twice in
 * dev, so without this the catalog would fetch twice per page load. The guard
 * is released when the attempt settles (success or error), letting a retry
 * start a fresh fetch.
 */
let catalogLoad: Promise<void> | null = null

/**
 * Single async seam: fetches products + categories ONCE, fills the catalog.ts
 * module singleton, and throws on the first failing query. Ordering reproduces
 * `compareCatalogOrder` server-side (sort_order ASC NULLS LAST, then id ASC).
 */
async function loadCatalog(): Promise<void> {
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, categories(sort_order)')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('id'),
      supabase
        .from('categories')
        .select('name,sort_order')
        .order('sort_order')
        .order('id'),
    ])

    if (productsRes.error) throw productsRes.error
    if (categoriesRes.error) throw categoriesRes.error

    // The `categories(sort_order)` embed rides along in the payload but is not
    // part of Product (future-proof); mapProductRow drops it by construction.
    setCatalogProducts((productsRes.data ?? []).map((row) => mapProductRow(row as ProductRow)))

    // Dev-only drift check, mirror of the seed's category validation against
    // the static tuple: categories are presentation contract, not data.
    const dbCategories = (categoriesRes.data ?? []).map(mapCategoryRow)
    if (
      dbCategories.length !== CATEGORIES.length ||
      dbCategories.some((name, index) => name !== CATEGORIES[index])
    ) {
      console.warn(
        '[CatalogProvider] Supabase categories differ from the static CATEGORIES tuple — run `npm run seed` to resync.',
      )
    }
  } catch (error) {
    console.error('[CatalogProvider] Failed to load the catalog from Supabase', error)
    throw error
  }
}

/**
 * Starts the catalog load if none is in flight and returns the shared attempt.
 * Success/error is signalled to the caller through the returned promise
 * (resolve = ready, reject = error); the provider maps it to its status state.
 */
export function ensureCatalogLoaded(): Promise<void> {
  if (!catalogLoad) {
    catalogLoad = loadCatalog().finally(() => {
      catalogLoad = null
    })
  }
  return catalogLoad
}