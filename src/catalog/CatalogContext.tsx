import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CatalogContext, ensureCatalogLoaded, type CatalogStatus } from './catalog-context'

/**
 * Provee el estado del catálogo (loading/ready/error) a toda la tienda.
 *
 * El fetch ocurre una sola vez al montar; el contenido NUNCA se renderiza
 * mientras `status` no sea `ready` (el gate de App devuelve la pantalla de
 * carga o de error antes de resolver rutas). Los consumidores leen el
 * singleton `PRODUCTS` de catalog.ts con sus imports actuales; este provider
 * solo alimenta el gate.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CatalogStatus>('loading')

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

  const retry = useCallback(() => {
    setStatus('loading')
    void ensureCatalogLoaded()
      .then(() => setStatus('ready'))
      .catch(() => setStatus('error'))
  }, [])

  const value = useMemo(() => ({ status, retry }), [status, retry])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}