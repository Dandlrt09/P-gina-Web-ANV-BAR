import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CatalogContext,
  ensureCatalogLoaded,
  getCatalogVersion,
  refreshCatalog,
  subscribeCatalogVersion,
  type CatalogStatus,
} from './catalog-context'
import { supabase } from '../shared/supabase'

/** Coalescing window for realtime events: a bulk import fires many row events
 *  that should collapse into one authoritative refetch. */
const REFETCH_DEBOUNCE_MS = 250

/**
 * Provee el estado del catálogo (loading/ready/error) a toda la tienda.
 *
 * El fetch ocurre una sola vez al montar; el contenido NUNCA se renderiza
 * mientras `status` no sea `ready` (el gate de App devuelve la pantalla de
 * carga o de error antes de resolver rutas). Los consumidores leen el
 * singleton `PRODUCTS` de catalog.ts con sus imports actuales; este provider
 * solo alimenta el gate y el contador `version`.
 *
 * Después de la carga inicial, un canal realtime compartido escucha
 * INSERT/UPDATE/DELETE de `products` y `categories`: cada evento agenda una
 * única relectura autoritativa (refreshCatalog) que repone el singleton y
 * sube `version`, de modo que los consumidores de useCatalog() re-renderizan
 * con los datos frescos sin recargar ni pasar por el gate. Un refresco que
 * falla mantiene los últimos datos buenos (nunca regresa a error).
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CatalogStatus>('loading')
  const [version, setVersion] = useState(getCatalogVersion)

  useEffect(() => {
    let cancelled = false
    void ensureCatalogLoaded()
      .then(() => {
        if (!cancelled) setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Canal global sin filtro: las tablas son pequeñas y cualquier movimiento
  // del panel admin se refleja aquí sin recargar. Desmontado en el cleanup.
  useEffect(() => {
    let debounceTimer: number | null = null
    const scheduleRefresh = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null
        void refreshCatalog()
      }, REFETCH_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel('storefront-catalog')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        scheduleRefresh,
      )
      .subscribe((channelStatus) => {
        if (channelStatus === 'CHANNEL_ERROR') console.warn('[catalog] realtime channel error')
      })

    const unsubscribe = subscribeCatalogVersion(() => setVersion(getCatalogVersion()))

    return () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer)
      unsubscribe()
      void supabase.removeChannel(channel)
    }
  }, [])

  const retry = useCallback(() => {
    setStatus('loading')
    void ensureCatalogLoaded()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'))
  }, [])

  const value = useMemo(() => ({ status, retry, version }), [status, retry, version])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}
