import { useEffect, useMemo, useRef, useState } from 'react'
import type { Product, ProductImage } from './catalog'

type ProductGalleryProps = {
  product: Product
  /** Índice del color activo: la galería muestra SOLO las fotos de esa variante. */
  colorIndex: number
  /** Clases del contenedor de imagen (alto fijo en dvh, fondo, redondeo). */
  containerClassName?: string
  /** Etiqueta de accesibilidad del conjunto de imágenes. */
  ariaLabel?: string
  /**
   * Modo de navegación:
   *  - 'arrows' (vista rápida): flechas ‹ › + contador n/N + teclado ←/→.
   *  - 'thumbnails' (ficha completa): miniaturas debajo de la principal; al
   *    elegir una pasa a principal y la anterior principal vuelve a la fila.
   *    El área de imagen se adapta a la relación real de la foto (sin
   *    franjas blancas laterales).
   */
  mode?: 'arrows' | 'thumbnails'
}

const FALLBACK_ASPECT = '4 / 5'

/**
 * Galería de imágenes de producto: muestra SOLO las fotos de la variante de
 * color activa (`colorIndex`) — su foto principal y sus fotos de `gallery`.
 *  - Modo 'arrows' (vista rápida): navegación con flechas, contador y teclado.
 *  - Modo 'thumbnails' (ficha completa): la principal domina y debajo una
 *    grilla de miniaturas; el área se adapta a la relación de la imagen.
 * Al cambiar de color la galería se reinicia a la primera foto de ESO color;
 * si el color no tiene fotos, se muestra un aviso honesto en lugar de caer a
 * las fotos de otra variante. No hay crossfade hover aquí (ese patrón vive en
 * las tarjetas del catálogo).
 */
export function ProductGallery({
  product,
  colorIndex,
  containerClassName = 'relative h-[46dvh] w-full overflow-hidden bg-white/80 sm:h-[52dvh]',
  ariaLabel = `Galería de ${product.name}`,
  mode = 'arrows',
}: ProductGalleryProps) {
  const [imageIndex, setImageIndex] = useState(0)
  // Modo thumbnails: orden actual de las imágenes, la principal en [0].
  const [ordered, setOrdered] = useState<ProductImage[] | null>(null)
  // Relación real (w/h) de la imagen principal cargada; null → fallback 4/5.
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const aspectRef = useRef<number | null>(null)

  /** Fotos del COLOR activo (su principal + cada entrada de su `gallery`, sin
   *  duplicados). Si el color no tiene imagen, la lista queda vacía y la
   *  galería muestra un aviso honesto. */
  const images = useMemo<ProductImage[]>(() => {
    const image = product.colors[colorIndex]?.image
    if (!image) return []
    const seen = new Set<string>()
    const list: ProductImage[] = []
    if (image.src && !seen.has(image.src)) {
      seen.add(image.src)
      list.push(image)
    }
    for (const extra of image.gallery ?? []) {
      if (extra && !seen.has(extra)) {
        seen.add(extra)
        list.push({ src: extra, label: image.label })
      }
    }
    return list
  }, [product, colorIndex])

  const currentList = mode === 'thumbnails' ? (ordered ?? images) : images
  const current = currentList[Math.min(imageIndex, currentList.length - 1)]

  const goTo = (next: number) => {
    if (currentList.length <= 1) return
    const target = ((next % currentList.length) + currentList.length) % currentList.length
    if (mode === 'thumbnails') {
      selectThumb(target)
      return
    }
    setImageIndex(target)
  }

  /** Modo thumbnails: intercambia la miniatura elegida con la principal. */
  const selectThumb = (index: number) => {
    if (index <= 0 || currentList.length <= 1) return
    setOrdered((cur) => {
      const list = [...(cur ?? images)]
      if (index >= list.length) return list
      const selected = list[index]
      list[index] = list[0]
      list[0] = selected
      return list
    })
  }

  // Al cambiar de color, la galería pasa a las fotos SOLO de ese color:
  // reset a la primera foto y al orden por miniaturas por defecto.
  useEffect(() => {
    setImageIndex(0)
    setOrdered(null)
  }, [colorIndex])

  // Teclado ←/→ para navegar la galería; no roba el foco de inputs
  // (p.ej. el textarea de la review en la ficha completa).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowLeft') goTo(imageIndex - 1)
      if (event.key === 'ArrowRight') goTo(imageIndex + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIndex, currentList.length, mode])

  // Al cambiar la principal en modo thumbnails, re-medir su relación real.
  const handleMainLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const el = event.currentTarget
    if (el.naturalWidth && el.naturalHeight) {
      const ratio = el.naturalWidth / el.naturalHeight
      if (ratio !== aspectRef.current) {
        aspectRef.current = ratio
        setAspectRatio(ratio)
      }
    }
  }

  // Carrusel de miniaturas: controla si hay desborde (para mostrar/ocultar
  // las flechas) y desplaza la fila con scroll suave.
  const thumbsRef = useRef<HTMLDivElement | null>(null)
  const [thumbsOverflow, setThumbsOverflow] = useState(false)

  useEffect(() => {
    const el = thumbsRef.current
    if (!el) return
    const update = () => setThumbsOverflow(el.scrollWidth > el.clientWidth + 1)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [currentList.length])

  const scrollThumbs = (dir: number) => {
    const el = thumbsRef.current
    if (!el) return
    const child = el.firstElementChild as HTMLElement | null
    const step = (child?.clientWidth ?? 80) + 8 // ancho de miniatura + gap
    el.scrollBy({ left: dir * step * 3, behavior: 'smooth' })
  }

  if (mode === 'thumbnails') {
    const mainAspect = aspectRatio ? `${aspectRatio}` : FALLBACK_ASPECT
    return (
      <div role="group" aria-label={ariaLabel}>
        {/* Imagen principal: el área sigue la relación real de la foto y la
            imagen se muestra con un "zoom out" (92% del área, centrada)
            para que se aprecie el encuadre completo, incluido el rostro.
            Sin recuadro ni sombra (estilo Vedére): la imagen flota
            directamente sobre el fondo de la página y su fondo blanco se
            funde con la superficie del sitio (mix-blend-multiply), de modo
            que nunca se recorta y no hay franjas blancas visibles. */}
        <div
          className="relative w-full"
          style={{ aspectRatio: mainAspect, maxHeight: '65dvh' }}
        >
          {images.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="font-display text-base italic tracking-wide text-brand-primary/70">
                Este color aún no tiene fotos
              </span>
              <span className="text-xs text-ink/60">
                Elegí otro color o cargá fotos desde el admin.
              </span>
            </div>
          ) : current?.src ? (
            <img
              key={current.src}
              src={current.src}
              alt={current.label ?? product.name}
              onLoad={handleMainLoad}
              className="mx-auto h-full w-full max-h-[92%] max-w-[92%] object-contain mix-blend-multiply"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="px-4 text-center font-display text-base italic tracking-wide text-brand-primary/70">
                {current?.label ?? product.name}
              </span>
            </div>
          )}
        </div>

        {/* Miniaturas (secundarias): carrusel centrado bajo la principal. Las
            flechas ‹ › solo existen cuando hay más fotos de las que entran
            (thumbsOverflow); si no hay desborde, la fila queda centrada sin
            flechas. Click en una miniatura para intercambiarla. */}
        {currentList.length > 1 && (
          <div className="mt-1 flex items-center justify-center gap-1.5">
            {thumbsOverflow && (
              <button
                type="button"
                onClick={() => scrollThumbs(-1)}
                aria-label="Ver fotos anteriores"
                className="grid size-8 shrink-0 place-items-center rounded-full border border-brand-primary/20 bg-surface text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface motion-reduce:transition-none"
              >
                ‹
              </button>
            )}
            <div
              ref={thumbsRef}
              className={`flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                thumbsOverflow ? 'justify-start' : 'justify-center'
              }`}
            >
              {currentList.map((img, index) => (
                <button
                  key={img.src ?? index}
                  type="button"
                  onClick={() => selectThumb(index)}
                  aria-label={
                    index === 0 ? `Foto principal de ${product.name}` : `Mostrar foto ${index + 1} de ${product.name}`
                  }
                  aria-pressed={index === 0}
                  className={`aspect-square w-[18%] min-w-14 max-w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-surface transition-colors motion-reduce:transition-none ${
                    index === 0
                      ? 'border-brand-primary'
                      : 'border-brand-primary/15 hover:border-brand-primary/40'
                  }`}
                >
                  {img.src ? (
                    <img
                      src={img.src}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover mix-blend-multiply"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center bg-brand-primary/5 px-1 text-center font-display text-[10px] italic leading-tight text-brand-primary/70">
                      {img.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {thumbsOverflow && (
              <button
                type="button"
                onClick={() => scrollThumbs(1)}
                aria-label="Ver fotos siguientes"
                className="grid size-8 shrink-0 place-items-center rounded-full border border-brand-primary/20 bg-surface text-brand-primary transition-colors hover:bg-brand-primary hover:text-surface motion-reduce:transition-none"
              >
                ›
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Modo 'arrows' (vista rápida): flechas, contador y teclado.
  return (
    <div role="group" aria-label={ariaLabel} className={containerClassName}>
      {images.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <span className="px-4 text-center font-display text-base italic tracking-wide text-brand-primary/70">
            Este color aún no tiene fotos
          </span>
          <span className="text-xs text-ink/60">
            Elegí otro color o cargá fotos desde el admin.
          </span>
        </div>
      ) : current?.src ? (
        <img
          key={current.src}
          src={current.src}
          alt={current.label ?? product.name}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="px-4 text-center font-display text-base italic tracking-wide text-brand-primary/70">
            {current?.label ?? product.name}
          </span>
        </div>
      )}

      {currentList.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goTo(imageIndex - 1)
            }}
            aria-label="Imagen anterior"
            className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-brand-primary/20 bg-surface/95 text-brand-primary shadow-sm transition-colors hover:bg-brand-primary hover:text-surface motion-reduce:transition-none"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goTo(imageIndex + 1)
            }}
            aria-label="Imagen siguiente"
            className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-brand-primary/20 bg-surface/95 text-brand-primary shadow-sm transition-colors hover:bg-brand-primary hover:text-surface motion-reduce:transition-none"
          >
            ›
          </button>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-xs tabular-nums text-brand-deep">
            {imageIndex + 1} / {currentList.length}
          </span>
        </>
      )}
    </div>
  )
}