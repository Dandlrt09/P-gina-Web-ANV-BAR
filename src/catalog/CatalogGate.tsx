/**
 * Full-viewport gate surfaces for the catalog read path.
 *
 * CatalogLoading is the branded shell shown while the single fetch is in
 * flight; CatalogError is the branded error + retry state. Both REPLACE the
 * routed content (home, favorites, product detail) from the App gate, so the
 * product grid and the empty-state copies ("El catálogo se está vistiendo" /
 * "Próximamente") can never flash while the catalog is not ready, and a
 * `#/producto/<unknown-id>` while loading never silently falls through to home.
 */

export function CatalogLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface font-sans text-ink">
      <div role="status" className="flex flex-col items-center gap-6 text-center">
        <p className="font-display text-2xl font-semibold tracking-wide text-brand-deep">ANV·BAR</p>
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary/50"
        />
        <span className="sr-only">Cargando el catálogo…</span>
      </div>
    </div>
  )
}

export function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 font-sans text-ink">
      <div
        role="alert"
        className="w-full max-w-md rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">ANV·BAR</p>
        <h1 className="mt-4 font-display text-3xl font-medium text-brand-deep sm:text-4xl">
          No pudimos cargar el catálogo
        </h1>
        <p className="mt-4 text-ink/80">
          Parece que hubo un problema de conexión. Revisa tu internet e intenta de nuevo.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-brand-primary/40 px-7 py-2.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5 motion-reduce:transition-none"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}