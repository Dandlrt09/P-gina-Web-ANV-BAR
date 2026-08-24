import { useEffect, useRef, useState } from 'react'
import { Container } from '../shared/Container'
import { listTestimonials, type Testimonial } from '../testimonials/testimonials'
import { supabase } from '../shared/supabase'

/** Con menos testimonios que esto se muestra la grilla estática; con más, el carrusel. */
const CAROUSEL_THRESHOLD = 4
/** Fracción del ancho visible que avanza cada flecha (misma mecánica que Novedades). */
const SCROLL_STEP = 0.8

/**
 * Tarjeta de un testimonio: la cita y el nombre de la clienta. Compartida por
 * la grilla estática y el carrusel para que ambos modos se vean iguales.
 */
function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex h-full flex-col rounded-xl border border-brand-primary/15 bg-white/60 p-6">
      <blockquote className="flex-1 text-ink/80">“{testimonial.text}”</blockquote>
      <figcaption className="mt-4 text-sm font-semibold text-brand-deep">
        {testimonial.name}
      </figcaption>
    </figure>
  )
}

/**
 * Sección "Testimonios" del storefront: lee los testimonios desde Supabase
 * (más reciente primero) y se suscribe al canal realtime de la tabla para
 * reflejar altas, ediciones y borrados del panel admin sin recargar.
 *
 * Máquina de estados con exactamente un estado visible a la vez: cargando
 * inicial (evita el flash de tarjetas vacías) → error con "Reintentar" /
 * vacío / contenido. Con menos de cuatro testimonios se muestra la grilla
 * estática; con cuatro o más, un carrusel snap sin dependencias que reutiliza
 * las mecánicas del carrusel de Novedades.
 */
export function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  /** Cambiarlo fuerza la relectura inicial (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  const stripRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const isCarousel = !failed && !isLoading && items.length >= CAROUSEL_THRESHOLD

  const syncArrows = () => {
    const el = stripRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    if (!isCarousel) return
    // Al entrar en modo carrusel —y ante cualquier cambio de filas mientras
    // dura— se recalculan las flechas; resize incluido para los quiebres.
    syncArrows()
    window.addEventListener('resize', syncArrows)
    return () => window.removeEventListener('resize', syncArrows)
  }, [isCarousel, items.length])

  const scrollByStep = (direction: 1 | -1) => {
    const el = stripRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * SCROLL_STEP, behavior: 'smooth' })
  }

  useEffect(() => {
    let alive = true
    setIsLoading(true)

    // Relectura autoritativa: al montar y ante cualquier evento realtime.
    // Refrescar cubre INSERT/UPDATE/DELETE con una sola ruta; los DELETE
    // llegan completos gracias a REPLICA IDENTITY FULL, así que nunca queda
    // un fantástico "ghost" en pantalla.
    const refresh = () => {
      listTestimonials()
        .then((rows) => {
          if (!alive) return
          setItems(rows)
          setFailed(false)
        })
        .catch(() => {
          if (alive) setFailed(true)
        })
        .finally(() => {
          if (alive) setIsLoading(false)
        })
    }

    refresh()

    // Canal global sin filtro: la tabla es pequeña y cualquier movimiento del
    // admin se refleja aquí sin recargar. Desmontado en el cleanup, sin
    // listeners huérfanos al salir del sitio.
    const channel = supabase
      .channel('storefront-testimonials')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'testimonials' },
        refresh,
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') console.warn('[testimonios] realtime channel error')
      })

    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [reloadToken])

  const retry = () => {
    setFailed(false)
    setReloadToken((token) => token + 1)
  }

  return (
    <section id="testimonios" className="scroll-mt-20 border-t border-brand-primary/10">
      <Container className="py-14 sm:py-20">
        <div className="relative">
          <div className={isCarousel ? 'max-w-xl pr-24' : undefined}>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Clientas</p>
            <h2 className="mt-3 font-display text-4xl font-medium text-brand-deep sm:text-5xl lg:text-6xl">
              Testimonios
            </h2>
          </div>

          {isCarousel && (
            <div className="absolute right-0 top-0 flex gap-2">
              <button
                type="button"
                onClick={() => scrollByStep(-1)}
                disabled={!canPrev}
                aria-label="Testimonios anteriores"
                className="grid size-10 place-items-center rounded-full border border-brand-primary/20 text-2xl leading-none text-brand-primary transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scrollByStep(1)}
                disabled={!canNext}
                aria-label="Testimonios siguientes"
                className="grid size-10 place-items-center rounded-full border border-brand-primary/20 text-2xl leading-none text-brand-primary transition-colors hover:bg-brand-primary/10 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {failed ? (
          <div className="mt-10 rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
            <p className="text-2xl" aria-hidden="true">
              !
            </p>
            <h3 className="mt-3 font-display text-xl font-medium text-brand-deep">
              No pudimos cargar los testimonios
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Revisa tu conexión e inténtalo de nuevo en un momento.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 inline-flex rounded-full border border-brand-primary/40 px-5 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface"
            >
              Reintentar
            </button>
          </div>
        ) : isLoading ? (
          <p className="mt-10 text-sm text-ink/60" role="status">
            Cargando testimonios…
          </p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
            <p className="text-2xl" aria-hidden="true">
              ✦
            </p>
            <h3 className="mt-3 font-display text-xl font-medium text-brand-deep">
              Aún no hay testimonios
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Muy pronto compartiremos aquí las experiencias de quienes ya vistieron ANV·BAR.
            </p>
          </div>
        ) : isCarousel ? (
          <div
            ref={stripRef}
            onScroll={syncArrows}
            className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:mt-12"
          >
            {items.map((testimonial) => (
              <div
                key={testimonial.id}
                className="w-[75%] shrink-0 snap-start sm:w-[45%] lg:w-[30%]"
              >
                <TestimonialCard testimonial={testimonial} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        )}
      </Container>
    </section>
  )
}
