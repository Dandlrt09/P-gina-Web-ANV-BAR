import { useEffect, useState, type FormEvent } from 'react'
import {
  CATEGORIES,
  formatCOP,
  type Product,
  type ProductColor,
} from '../../data/catalog'
import {
  createProduct,
  fetchProduct,
  listExistingIds,
  removeStrayUploads,
  slugifyName,
  uniqueSlug,
  updateProduct,
  uploadProductImage,
  validateProductInput,
  type AdminProductInput,
} from '../../lib/admin/products'

/**
 * Formulario de producto del admin (rutas #/admin/productos/nuevo y
 * #/admin/productos/<id>), compartido entre alta y edición (SC-PA-01).
 *
 * Contrato CR-PA-02: id slug (solo alta), name, category (desde CATEGORIES),
 * price_cop int >= 0, isNew, sortOrder, editorial/fabric/care, sizes como
 * multi-tag → jsonb, colors[] con subida de fotos → URL absoluta pública →
 * colors.jsonb. Payload inválido → rechazado sin tocar la base (SC-PA-04).
 */

type ColorDraft = {
  name: string
  hex: string
  label: string
  src: string | null
  srcFile: File | null
  gallery: string[]
  galleryFiles: File[]
}

type ProductFormProps = {
  mode: 'create' | 'edit'
  productId?: string
}

const DEFAULT_HEX = '#58232c'
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/gif'
const SUGGESTED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'Único']

function emptyColor(): ColorDraft {
  return { name: '', hex: DEFAULT_HEX, label: '', src: null, srcFile: null, gallery: [], galleryFiles: [] }
}

function colorToDraft(color: ProductColor): ColorDraft {
  return {
    name: color.name,
    hex: /^#[0-9a-fA-F]{6}$/.test(color.hex) ? color.hex : DEFAULT_HEX,
    label: color.image?.label ?? '',
    src: color.image?.src ?? null,
    srcFile: null,
    gallery: [...(color.image?.gallery ?? [])],
    galleryFiles: [],
  }
}

const inputClass =
  'w-full rounded-lg border border-brand-primary/20 bg-surface px-3 py-2 text-ink outline-none transition-colors focus:border-brand-primary'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-brand-deep'

export function ProductForm({ mode, productId }: ProductFormProps) {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  const [id, setId] = useState('')
  const [idTouched, setIdTouched] = useState(false)
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Product['category']>(CATEGORIES[0])
  const [price, setPrice] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [sortOrder, setSortOrder] = useState('')
  const [editorial, setEditorial] = useState('')
  const [fabric, setFabric] = useState('')
  const [care, setCare] = useState('')
  const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L'])
  const [sizeInput, setSizeInput] = useState('')
  const [colors, setColors] = useState<ColorDraft[]>([emptyColor()])

  const [issues, setIssues] = useState<Array<{ field: string; message: string }>>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (mode !== 'create') return
    // Carga best-effort de los ids existentes solo al alta: alimenta el slug
    // único automático. Si falla, el insert reportará el duplicado igual.
    let active = true
    listExistingIds()
      .then((ids) => {
        if (active) setExistingIds(new Set(ids))
      })
      .catch(() => {
        /* sin la lista seguimos: el slug se genera igual y la validación
           previa al guardar cubre el resto */
      })
    return () => {
      active = false
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'create') {
      setLoadState('ready')
      return
    }
    if (!productId) {
      setLoadState('missing')
      return
    }
    let active = true
    fetchProduct(productId)
      .then((product) => {
        if (!active) return
        if (!product) {
          setLoadState('missing')
          return
        }
        setId(product.id)
        setName(product.name)
        setCategory(product.category)
        setPrice(String(product.priceCOP))
        setIsNew(product.isNew ?? false)
        setSortOrder(product.sortOrder != null ? String(product.sortOrder) : '')
        setEditorial(product.editorial)
        setFabric(product.fabric)
        setCare(product.care)
        setSizes([...product.sizes].filter(Boolean))
        setColors(product.colors.map(colorToDraft))
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })
    return () => {
      active = false
    }
  }, [mode, productId, attempt])

  const handleNameChange = (value: string) => {
    setName(value)
    if (mode === 'create' && !idTouched) {
      setId(uniqueSlug(slugifyName(value), existingIds))
    }
  }

  const handleRegenerateId = () => {
    setIdTouched(false)
    setId(uniqueSlug(slugifyName(name), existingIds))
  }

  const addSize = () => {
    const value = sizeInput.trim()
    if (!value) return
    if (!sizes.includes(value)) setSizes((prev) => [...prev, value])
    setSizeInput('')
  }

  const removeSize = (value: string) => {
    setSizes((prev) => prev.filter((size) => size !== value))
  }

  const updateColor = (index: number, patch: Partial<ColorDraft>) => {
    setColors((prev) => prev.map((color, i) => (i === index ? { ...color, ...patch } : color)))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setIssues([])
    setApiError(null)

    const priceCOP = Number(price.trim())
    const sortOrderParsed = sortOrder.trim() === '' ? null : Number(sortOrder.trim())
    const finalSizes = category === 'Accesorios' ? ['Único'] : sizes

    // Draft para validar ANTES de tocar storage o base. La imagen existe si ya
    // hay src/gallery o si hay un archivo pendiente de subir (necesita label).
    const draft = {
      id: mode === 'edit' && productId ? productId.trim() : id.trim(),
      name,
      category,
      priceCOP,
      isNew,
      sortOrder: sortOrderParsed != null && Number.isFinite(sortOrderParsed) ? sortOrderParsed : null,
      editorial,
      fabric,
      care,
      sizes: finalSizes,
      colors: colors.map((draftColor) => {
        const hasImage =
          draftColor.src !== null ||
          draftColor.srcFile !== null ||
          draftColor.gallery.length > 0 ||
          draftColor.galleryFiles.length > 0
        const image: ProductColor['image'] | undefined = hasImage
          ? { label: draftColor.label.trim() }
          : undefined
        return { name: draftColor.name.trim(), hex: draftColor.hex.trim(), ...(image ? { image } : {}) }
      }),
    } satisfies AdminProductInput

    const found = validateProductInput(draft)
    if (found.length > 0) {
      setIssues(found)
      return
    }
    if (mode === 'create' && existingIds.has(draft.id)) {
      setIssues([
        {
          field: 'id',
          message: `Ya existe un producto con el identificador "${draft.id}". Probá con otro o usá "Generar desde el nombre".`,
        },
      ])
      return
    }

    setSaving(true)
    const uploadedPaths: string[] = []
    try {
      const uploadedColors: ProductColor[] = []
      for (const draftColor of colors) {
        let src = draftColor.src ?? undefined
        if (draftColor.srcFile) {
          const upload = await uploadProductImage(draft.id, draftColor.srcFile)
          uploadedPaths.push(upload.path)
          src = upload.url
        }
        const gallery = [...draftColor.gallery]
        for (const file of draftColor.galleryFiles) {
          const upload = await uploadProductImage(draft.id, file)
          uploadedPaths.push(upload.path)
          gallery.push(upload.url)
        }
        const hasImage = src !== undefined || gallery.length > 0
        const image: ProductColor['image'] | undefined = hasImage
          ? {
              label: draftColor.label.trim(),
              ...(src ? { src } : {}),
              ...(gallery.length > 0 ? { gallery } : {}),
            }
          : undefined
        uploadedColors.push({
          name: draftColor.name.trim(),
          hex: draftColor.hex.trim(),
          ...(image ? { image } : {}),
        })
      }

      const payload: AdminProductInput = { ...draft, colors: uploadedColors }
      if (mode === 'create') {
        await createProduct(payload)
      } else {
        await updateProduct(payload)
      }
      setSaved(true)
      window.setTimeout(() => {
        window.location.hash = '/admin/productos'
      }, 700)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setApiError(message)
      if (uploadedPaths.length > 0) void removeStrayUploads(uploadedPaths)
    } finally {
      setSaving(false)
    }
  }

  if (loadState === 'error') {
    return (
      <section className="py-10 sm:py-14">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-brand-primary/25 bg-white/60 p-8 text-center">
            <h1 className="font-display text-2xl font-medium text-brand-deep">No pudimos cargar el producto</h1>
            <p className="mt-2 text-ink/80">Revisá tu conexión e intentá de nuevo.</p>
            <button
              type="button"
              onClick={() => {
                setLoadState('loading')
                setAttempt((prev) => prev + 1)
              }}
              className="mt-6 rounded-full bg-brand-primary px-7 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
            >
              Reintentar
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (loadState === 'missing') {
    return (
      <section className="py-10 sm:py-14">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-brand-primary/15 bg-white/60 p-8 text-center">
            <h1 className="font-display text-2xl font-medium text-brand-deep">Producto no encontrado</h1>
            <a
              href="#/admin/productos"
              className="mt-6 inline-block rounded-full bg-brand-primary px-7 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep"
            >
              Volver al listado
            </a>
          </div>
        </div>
      </section>
    )
  }

  if (loadState === 'loading') {
    return (
      <section className="py-10 sm:py-14">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          <div role="status" className="flex items-center justify-center gap-3 py-12">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary/50" />
            <span className="text-sm text-ink/70">Cargando producto…</span>
          </div>
        </div>
      </section>
    )
  }

  const pricePreview = Number.isInteger(Number(price.trim())) && Number(price.trim()) >= 0 ? formatCOP(Number(price.trim())) : ''

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-medium text-brand-deep sm:text-3xl">
            {mode === 'create' ? 'Nuevo producto' : `Editar producto — ${id}`}
          </h1>
          <a
            href="#/admin/productos"
            className="rounded-full border border-brand-primary/40 px-5 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
          >
            Cancelar
          </a>
        </div>

        {saved && (
          <div role="status" className="mt-6 rounded-xl border border-brand-primary/20 bg-white/60 p-5 text-sm font-medium text-brand-deep">
            Producto guardado. Volviendo al listado…
          </div>
        )}
        {apiError && !saved && (
          <div role="alert" className="mt-6 rounded-xl border border-brand-primary/25 bg-white/60 p-5 text-sm text-brand-deep">
            <p className="font-medium">No se pudo guardar el producto</p>
            <p className="mt-1 text-ink/80">{apiError}</p>
          </div>
        )}
        {issues.length > 0 && !saved && (
          <div role="alert" className="mt-6 rounded-xl border border-brand-primary/25 bg-white/60 p-5 text-sm text-brand-deep">
            <p className="font-medium">Revisá los siguientes campos:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-ink/80">
              {issues.map((issue) => (
                <li key={issue.field}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-8">
          <fieldset className="flex flex-col gap-4 rounded-xl border border-brand-primary/15 bg-white/60 p-5 sm:p-6">
            <legend className="px-2 font-display text-lg text-brand-deep">Datos básicos</legend>
            {mode === 'create' ? (
              <label className={labelClass}>
                Identificador (slug)
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value)
                      setIdTouched(true)
                    }}
                    placeholder="vestido-marfil"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateId}
                    className="shrink-0 rounded-full border border-brand-primary/40 px-4 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
                  >
                    Generar desde el nombre
                  </button>
                </div>
                <span className="text-xs text-ink/60">
                  {mode === 'create' && !idTouched && id !== ''
                    ? `Automático desde el nombre: ${id}. Podés ajustarlo antes de guardar; no se puede editar después.`
                    : 'Minúsculas, números y guiones. Se usa en los enlaces y favoritos; no se puede editar después.'}
                </span>
              </label>
            ) : (
              <p className="text-sm text-ink/80">
                <span className="font-medium text-brand-deep">Identificador:</span> {id}
              </p>
            )}
            <label className={labelClass}>
              Nombre
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Categoría
              <select value={category} onChange={(e) => setCategory(e.target.value as Product['category'])} className={inputClass}>
                {!CATEGORIES.includes(category as Product['category']) && (
                  <option value={category} disabled>
                    {category} (no vigente)
                  </option>
                )}
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {CATEGORIES.includes(category as Product['category']) ? (
                <span className="text-xs text-ink/60">
                  Lista vigente del catálogo (la capa de categorías dinámicas llega en una etapa posterior).
                </span>
              ) : (
                <span className="text-xs font-medium text-brand-deep">
                  Este producto quedó fuera del catálogo: la categoría «{category}» ya no está en la lista
                  vigente. Elegí una categoría para que vuelva a aparecer.
                </span>
              )}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Precio (COP, entero)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={inputClass}
                />
                {pricePreview && <span className="text-xs text-ink/60">Se mostrará como {pricePreview}</span>}
              </label>
              <label className={labelClass}>
                Orden de presentación (0 = primero)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
                <span className="text-xs text-ink/60">Opcional: sin orden, la pieza va después de las numeradas.</span>
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium text-brand-deep">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="size-4 accent-brand-primary"
              />
              Marcar como novedad (aparece en la cinta y en portada)
            </label>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-xl border border-brand-primary/15 bg-white/60 p-5 sm:p-6">
            <legend className="px-2 font-display text-lg text-brand-deep">Datos técnicos</legend>
            <label className={labelClass}>
              Tela
              <input type="text" value={fabric} onChange={(e) => setFabric(e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Cuidado
              <input type="text" value={care} onChange={(e) => setCare(e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Texto editorial
              <textarea
                value={editorial}
                onChange={(e) => setEditorial(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-xl border border-brand-primary/15 bg-white/60 p-5 sm:p-6">
            <legend className="px-2 font-display text-lg text-brand-deep">Tallas</legend>
            {category === 'Accesorios' ? (
              <p className="text-sm text-ink/80">Los accesorios se guardan siempre con la talla «Único».</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <span
                      key={size}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/30 bg-surface px-3 py-1 text-sm text-brand-deep"
                    >
                      {size}
                      <button
                        type="button"
                        onClick={() => removeSize(size)}
                        aria-label={`Quitar talla ${size}`}
                        className="text-brand-primary transition-colors hover:text-brand-deep"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSize()
                      }
                    }}
                    placeholder="Ej: M"
                    className={`${inputClass} sm:max-w-[10rem]`}
                  />
                  <button
                    type="button"
                    onClick={addSize}
                    className="rounded-full border border-brand-primary/40 px-4 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
                  >
                    Agregar
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_SIZES.filter((suggestion) => !sizes.includes(suggestion)).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setSizes((prev) => [...prev, suggestion])}
                        className="rounded-full bg-brand-primary/5 px-2.5 py-1 text-xs text-brand-deep transition-colors hover:bg-brand-primary/10"
                      >
                        +{suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-xl border border-brand-primary/15 bg-white/60 p-5 sm:p-6">
            <legend className="px-2 font-display text-lg text-brand-deep">Variantes de color</legend>
            {colors.map((draftColor, index) => (
              <article
                key={index}
                className="flex flex-col gap-4 rounded-xl border border-brand-primary/10 bg-surface/60 p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <label className={labelClass}>
                    Nombre del color
                    <input
                      type="text"
                      value={draftColor.name}
                      onChange={(e) => updateColor(index, { name: e.target.value })}
                      placeholder="Ej: Burdeo"
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Hex
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(draftColor.hex) ? draftColor.hex : DEFAULT_HEX}
                        onChange={(e) => updateColor(index, { hex: e.target.value })}
                        className="h-10 w-12 cursor-pointer rounded-lg border border-brand-primary/20 bg-surface p-1"
                        aria-label={`Color hexadecimal de la variante ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={draftColor.hex}
                        onChange={(e) => updateColor(index, { hex: e.target.value })}
                        placeholder="#rrggbb"
                        className={inputClass}
                      />
                    </div>
                  </label>
                </div>

                <label className={labelClass}>
                  Texto de la foto (label)
                  <input
                    type="text"
                    value={draftColor.label}
                    onChange={(e) => updateColor(index, { label: e.target.value })}
                    placeholder="Ej: Camisa Ónix — Negro"
                    className={inputClass}
                  />
                  <span className="text-xs text-ink/60">
                    Obligatorio si cargaste o guardaste una foto. Se usa como texto alternativo y placeholder.
                  </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-brand-deep">Foto principal</span>
                    {(draftColor.src || draftColor.srcFile) && (
                      <div className="flex items-center gap-3">
                        {draftColor.src && (
                          <img src={draftColor.src} alt={draftColor.label || 'Foto actual'} className="h-20 w-16 rounded-lg object-cover" />
                        )}
                        <span className="text-xs text-ink/70">
                          {draftColor.srcFile ? `${draftColor.srcFile.name} (se subirá al guardar)` : 'Imagen actual (se conserva)'}
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept={ACCEPT_IMAGES}
                      onChange={(e) => updateColor(index, { srcFile: e.target.files?.[0] ?? null })}
                      className="text-sm text-ink/70 file:mr-3 file:rounded-full file:border-0 file:bg-brand-primary file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-surface"
                    />
                    <span className="text-xs text-ink/60">JPG, PNG, WEBP o GIF · máx. 5 MB por archivo.</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-brand-deep">Fotos adicionales</span>
                    {(draftColor.gallery.length > 0 || draftColor.galleryFiles.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {draftColor.gallery.map((url) => (
                          <img key={url} src={url} alt={draftColor.label || 'Foto adicional'} className="h-16 w-12 rounded-lg object-cover" />
                        ))}
                        {draftColor.galleryFiles.map((file) => (
                          <span
                            key={file.name}
                            className="inline-flex items-center rounded-lg border border-brand-primary/20 bg-surface px-2 py-1 text-xs text-ink/70"
                          >
                            {file.name}…
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      type="file"
                      accept={ACCEPT_IMAGES}
                      multiple
                      onChange={(e) => {
                        const picked = e.target.files ? [...e.target.files] : []
                        updateColor(index, { galleryFiles: [...draftColor.galleryFiles, ...picked] })
                      }}
                      className="text-sm text-ink/70 file:mr-3 file:rounded-full file:border-0 file:bg-brand-primary file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-surface"
                    />
                    <span className="text-xs text-ink/60">JPG, PNG, WEBP o GIF · máx. 5 MB por archivo.</span>
                    {draftColor.galleryFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => updateColor(index, { galleryFiles: [] })}
                        className="text-left text-xs text-brand-primary transition-colors hover:text-brand-deep"
                      >
                        Quitar fotos pendientes
                      </button>
                    )}
                  </div>
                </div>

                {colors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setColors((prev) => prev.filter((_, i) => i !== index))}
                    className="self-start rounded-full border border-brand-primary/40 px-4 py-1.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/10"
                  >
                    Quitar esta variante
                  </button>
                )}
              </article>
            ))}
            <button
              type="button"
              onClick={() => setColors((prev) => [...prev, emptyColor()])}
              className="self-start rounded-full border border-brand-primary/40 px-5 py-2 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
            >
              + Agregar variante de color
            </button>
          </fieldset>

          <div className="flex justify-end gap-3">
            <a
              href="#/admin/productos"
              className="rounded-full border border-brand-primary/40 px-7 py-2.5 text-sm font-medium text-brand-deep transition-colors hover:bg-brand-primary/5"
            >
              Cancelar
            </a>
            <button
              type="submit"
              disabled={saving || saved}
              className="rounded-full bg-brand-primary px-7 py-2.5 text-sm font-medium text-surface transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}