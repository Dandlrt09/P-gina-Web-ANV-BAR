/**
 * ANV·BAR — Catálogo (fuente única de contenido reemplazable).
 *
 * CÓMO EDITAR EL SITIO SIN TOCAR CÓDIGO:
 *  - Cambia precios, nombres, telas, cuidados o textos editoriales en PRODUCTS.
 *  - Cambia testimonios en TESTIMONIALS y el perfil de la diseñadora en DESIGNER.
 *  - Reemplaza una foto: asigna `src` en la variante de color (ruta dentro de
 *    /public o URL externa). Mientras `src` quede vacío, la interfaz muestra un
 *    placeholder tipográfico elegante con `label`.
 *
 * Convenciones del tipo Product:
 *  - priceCOP SIEMPRE en pesos enteros sin decimales (250000 → "$250.000").
 *  - colors contiene variantes de color REALES (nombre + hex exacto).
 *  - No hay ofertas ni descuentos: site MUST NOT mostrar badges de SALE.
 *    Si un producto necesita un badge distinto al estándar "Bajo pedido 3-5 días",
 *    usa el campo opcional `badge`.
 */

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type ProductImage = {
  /** Ruta de la foto real (carpeta /public o URL). Vacío → placeholder elegante. */
  src?: string
  /** Foto secundaria del mismo producto: se muestra al pasar el mouse y
   *  se vuelve a la principal al quitarlo (hover). Opcional. */
  secondarySrc?: string
  /** Texto corto: se muestra en el placeholder tipográfico y sirve de alt. Ej: "Burdeo". */
  label: string
}

export type ProductColor = {
  /** Nombre visible del color, tal como aparece en la ficha del producto. */
  name: string
  /** Hex exacto del color (#rrggbb). */
  hex: string
  /** Foto opcional por variante de color. */
  image?: ProductImage
}

export type Product = {
  /** Identificador único del producto (enlaces y favoritos). No debe repetirse. */
  id: string
  /** Nombre de venta del producto. */
  name: string
  /** Categoría: debe ser uno de los valores de CATEGORIES. */
  category: ProductCategory
  /** Precio en pesos colombianos, SOLO enteros sin decimales (ej. 250000 = "$250.000"). */
  priceCOP: number
  /** Variantes de color reales del producto. */
  colors: ProductColor[]
  /** Imagen editorial de la "pieza estrella" (sección grande de novedades).
   *  Si falta, esa sección usa la foto principal de la primera variante. */
  featuredImage?: ProductImage
  /** Tallas disponibles (ej. ["XS","S","M","L","XL"] o ["Único"] para accesorios). */
  sizes: string[]
  /** Tela principal; se muestra en los datos técnicos de la ficha. */
  fabric: string
  /** Instrucciones de cuidado; se muestran en los datos técnicos de la ficha. */
  care: string
  /** Texto editorial de la ficha: voz de marca, 1-2 frases. */
  editorial: string
  /** Flag de novedad (lo marca Anays): la pieza aparece en la cinta de novedades. */
  isNew?: boolean
  /** Fecha ISO YYYY-MM-DD para ordenar la cinta de novedades (más reciente primero). */
  addedAt?: string
  /** Badge opcional. Si falta, la interfaz muestra el badge estándar de la marca:
   *  "Bajo pedido 3-5 días". No usar badges de oferta. */
  badge?: string
}

export type Testimonial = {
  /** Nombre de la clienta ("Clienta ANV·BAR" si prefiere anonimato). */
  name: string
  /** Ciudad (opcional). */
  city?: string
  /** Texto del testimonio en español neutro. */
  text: string
}

export type DesignerProfile = {
  /** Nombre de la diseñadora. */
  name: string
  /** Rol o firma que aparece junto al nombre. */
  role: string
  /** Biografía corta (texto de ejemplo, reemplazable). */
  bio: string
  /** Historia de la colección. */
  collection: {
    /** Nombre de la colección (ej. "RUBRA"). */
    name: string
    /** Relato de la colección en español neutro. */
    story: string
  }
  /** Frase de marca; se mantiene en su idioma original. */
  claim: string
}

/* ------------------------------------------------------------------ */
/* Categorías del catálogo (orden de presentación "todo a la vista")   */
/* ------------------------------------------------------------------ */

export const CATEGORIES = [
  'Vestidos',
  'Conjuntos',
  'Camisas',
  'Faldas',
  'Pantalones',
  'Sets',
  'Accesorios',
] as const

export type ProductCategory = (typeof CATEGORIES)[number]

/* ------------------------------------------------------------------ */
/* Productos de ejemplo (colección RUBRA)                              */
/* ------------------------------------------------------------------ */

export const PRODUCTS: Product[] = [
  {
    id: 'vestido-rubra-nocturno',
    name: 'Vestido RUBRA Nocturno',
    category: 'Vestidos',
    priceCOP: 320000,
    colors: [
      {
        name: 'Burdeo',
        hex: '#58232c',
        image: {
          src: '/imagenes/vestido-rubra-nocturno.jpg',
          secondarySrc: '/imagenes/vestido-rubra-nocturno-v2.jpg',
          label: 'Vestido RUBRA Nocturno — Burdeo',
        },
      },
      { name: 'Negro', hex: '#000000', image: { label: 'Vestido RUBRA Nocturno — Negro' } },
    ],
    featuredImage: {
      src: '/imagenes/featured-rubra-nocturno.jpg',
      secondarySrc: '/imagenes/featured-rubra-nocturno-v2.jpg',
      label: 'Vestido RUBRA Nocturno — Pieza estrella',
    },
    sizes: ['S', 'M', 'L'],
    fabric: 'Gasa de seda',
    care: 'Lavar a mano con agua fría. Secar a la sombra. No usar blanqueador.',
    editorial:
      'El vestido que abre la colección RUBRA, hecho para las noches en las que la brisa también se viste. Cae con el peso justo: ligera, roja, inolvidable.',
    isNew: true,
    addedAt: '2026-08-15',
  },
  {
    id: 'vestido-trinitaria',
    name: 'Vestido Trinitaria',
    category: 'Vestidos',
    priceCOP: 280000,
    colors: [
      {
        name: 'Marfil',
        hex: '#f3f2ef',
        image: {
          src: '/imagenes/vestido-trinitaria.jpg',
          secondarySrc: '/imagenes/vestido-trinitaria-v2.jpg',
          label: 'Vestido Trinitaria — Marfil',
        },
      },
      { name: 'Rosa empolvado', hex: '#d9b8ac', image: { label: 'Vestido Trinitaria — Rosa empolvado' } },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    fabric: 'Viscosa lavable',
    care: 'Lavar a mano con agua fría. Secar a la sombra. No usar secadora.',
    editorial:
      'La trinitaria se hizo vestido: tres pétalos y una silueta que se mueve contigo desde el café de la mañana hasta el primer destello del atardecer.',
    isNew: true,
    addedAt: '2026-08-14',
  },
  {
    id: 'vestido-ceremonia-marfil',
    name: 'Vestido Ceremonia Marfil',
    category: 'Vestidos',
    priceCOP: 380000,
    colors: [
      {
        name: 'Marfil',
        hex: '#f3f2ef',
        image: {
          src: '/imagenes/vestido-ceremonia-marfil.jpg',
          secondarySrc: '/imagenes/vestido-ceremonia-marfil-v2.jpg',
          label: 'Vestido Ceremonia Marfil — Marfil',
        },
      },
      { name: 'Dorado', hex: '#8c6d51', image: { label: 'Vestido Ceremonia — Dorado' } },
    ],
    sizes: ['S', 'M', 'L'],
    fabric: 'Crepé de poliéster',
    care: 'Lavar en seco o a mano con agua fría. Planchar a baja temperatura por el revés.',
    editorial:
      'Para el instante en que entras por la puerta: marfil y un brillo contenido que acompaña sin pedir permiso. Tú guardas la fecha; él guarda tu silueta.',
    isNew: true,
    addedAt: '2026-08-13',
  },
  {
    id: 'conjunto-trinitaria',
    name: 'Conjunto Trinitaria',
    category: 'Conjuntos',
    priceCOP: 260000,
    colors: [
      { name: 'Burdeo', hex: '#58232c', image: { label: 'Conjunto Trinitaria — Burdeo' } },
      { name: 'Marfil', hex: '#f3f2ef', image: { label: 'Conjunto Trinitaria — Marfil' } },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    fabric: 'Popelina de algodón',
    care: 'Lavar a máquina en ciclo suave con agua fría. Secar a la sombra.',
    editorial:
      'El conjunto que le dio nombre a RUBRA: superior y falda en el mismo color de piel de la flor. Vístete del Caribe sin esforzarte.',
    isNew: true,
    addedAt: '2026-08-12',
  },
  {
    id: 'conjunto-brisa-caribe',
    name: 'Conjunto Brisa Caribe',
    category: 'Conjuntos',
    priceCOP: 240000,
    colors: [
      { name: 'Marfil', hex: '#f3f2ef', image: { label: 'Conjunto Brisa Caribe — Marfil' } },
      { name: 'Azul noche', hex: '#1e2a3a', image: { label: 'Conjunto Brisa Caribe — Azul noche' } },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    fabric: 'Lino bien vestido',
    care: 'Lavar a mano con agua fría. No retorcer. Planchar ligeramente húmedo.',
    editorial:
      'El lino que respira contigo, liviano como la brisa de la tarde en la playa. Un conjunto fresco que llega vestido donde la arena empieza.',
  },
  {
    id: 'camisa-riviera',
    name: 'Camisa Riviera',
    category: 'Camisas',
    priceCOP: 180000,
    colors: [
      { name: 'Marfil', hex: '#f3f2ef', image: { label: 'Camisa Riviera — Marfil' } },
      { name: 'Ocre', hex: '#b08d57', image: { label: 'Camisa Riviera — Ocre' } },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    fabric: 'Popelina de algodón',
    care: 'Lavar a máquina en ciclo suave con agua fría. Secar a la sombra.',
    editorial:
      'Del escritorio a la orilla del mar sin cambiar de camisa: cortes limpios y un tono de tierra que el Caribe reconoce al instante.',
  },
  {
    id: 'camisa-onix',
    name: 'Camisa Ónix',
    category: 'Camisas',
    priceCOP: 190000,
    colors: [
      { name: 'Negro', hex: '#000000', image: { label: 'Camisa Ónix — Negro' } },
      { name: 'Dorado', hex: '#8c6d51', image: { label: 'Camisa Ónix — Dorado' } },
    ],
    sizes: ['S', 'M', 'L'],
    fabric: 'Seda satinada',
    care: 'Lavar a mano con agua fría. Secar a la sombra. No usar secadora.',
    editorial:
      'Negro para la noche, dorado para el detalle: la seda convierte cualquier plan en ocasión.',
  },
  {
    id: 'falda-plisada-contraluz',
    name: 'Falda Plisada Contraluz',
    category: 'Faldas',
    priceCOP: 220000,
    colors: [
      {
        name: 'Dorado',
        hex: '#8c6d51',
        image: {
          src: '/imagenes/falda-plisada-contraluz.jpg',
          secondarySrc: '/imagenes/falda-plisada-contraluz-v2.jpg',
          label: 'Falda Plisada — Dorado',
        },
      },
      { name: 'Burdeo', hex: '#58232c', image: { label: 'Falda Plisada — Burdeo' } },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    fabric: 'Gasa de seda',
    care: 'Lavar a mano con agua fría. Secar a la sombra. No usar blanqueador.',
    editorial:
      'Pliegues que atrapan el contraluz y lo sueltan al caminar. Se mueve primero; tú solo entra haciendo favor.',
  },
  {
    id: 'pantalon-linea-delta',
    name: 'Pantalón Línea Delta',
    category: 'Pantalones',
    priceCOP: 210000,
    colors: [
      { name: 'Burdeo profundo', hex: '#390f12', image: { label: 'Pantalón Línea Delta — Burdeo profundo' } },
      { name: 'Negro', hex: '#000000', image: { label: 'Pantalón Línea Delta — Negro' } },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    fabric: 'Crepé de poliéster',
    care: 'Lavar a mano con agua fría. Secar a la sombra. Planchar a baja temperatura.',
    editorial:
      'La pierna recta que estira la silueta y no olvida el puerto. Del centro de la ciudad a la Santa Marta de siempre, con caída impecable.',
  },
  {
    id: 'set-resort-cayena',
    name: 'Set Resort Cayena',
    category: 'Sets',
    priceCOP: 300000,
    colors: [
      {
        name: 'Coral',
        hex: '#d97a63',
        image: {
          src: '/imagenes/set-resort-cayena.jpg',
          secondarySrc: '/imagenes/set-resort-cayena-v2.jpg',
          label: 'Set Resort Cayena — Coral',
        },
      },
      { name: 'Marfil', hex: '#f3f2ef', image: { label: 'Set Resort Cayena — Marfil' } },
    ],
    sizes: ['S', 'M', 'L'],
    fabric: 'Viscosa lavable',
    care: 'Lavar a mano con agua fría. Secar a la sombra. No usar secadora.',
    editorial:
      'La cayena florece en un tres piezas que se combina solo: resort de día, cena junto al mar cuando cae la noche.',
    isNew: true,
    addedAt: '2026-08-11',
  },
  {
    id: 'set-bahia',
    name: 'Set Bahía',
    category: 'Sets',
    priceCOP: 290000,
    colors: [
      { name: 'Verde salvia', hex: '#9aa38b', image: { label: 'Set Bahía — Verde salvia' } },
      { name: 'Marfil', hex: '#f3f2ef', image: { label: 'Set Bahía — Marfil' } },
    ],
    sizes: ['XS', 'S', 'M', 'L'],
    fabric: 'Popelina de algodón',
    care: 'Lavar a máquina en ciclo suave con agua fría. Secar a la sombra.',
    editorial:
      'Tonos de salvia y la calma de una bahía a media tarde, en dos piezas que abrazan el descanso.',
  },
  {
    id: 'turbante-seda-rubra',
    name: 'Turbante Seda RUBRA',
    category: 'Accesorios',
    priceCOP: 95000,
    colors: [
      { name: 'Burdeo profundo', hex: '#390f12', image: { label: 'Turbante Seda — Burdeo profundo' } },
      { name: 'Dorado', hex: '#8c6d51', image: { label: 'Turbante Seda — Dorado' } },
      { name: 'Negro', hex: '#000000', image: { label: 'Turbante Seda — Negro' } },
    ],
    sizes: ['Único'],
    fabric: 'Seda satinada',
    care: 'Lavar a mano con agua fría. Secar a la sombra. No planchar directamente.',
    editorial:
      'El cierre perfecto de RUBRA: seda que corona cualquier look con la firma silenciosa de la colección.',
    isNew: true,
    addedAt: '2026-08-10',
  },
]

/* ------------------------------------------------------------------ */
/* Testimonios (texto de ejemplo, reemplazable)                        */
/* ------------------------------------------------------------------ */

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Valentina R.',
    city: 'Barranquilla',
    text: 'El vestido llegó en el tiempo prometido y el acabado se siente hecho a mano. La tela es todavía más bonita en persona.',
  },
  {
    name: 'María José P.',
    city: 'Cartagena',
    text: 'Pedí el Conjunto Trinitaria por WhatsApp y en tres días estaba listo. Anays me ayudó a elegir la talla perfecta.',
  },
  {
    name: 'Daniela M.',
    city: 'Santa Marta',
    text: 'La atención fue cálida y el envío al Caribe puntual. Ya tengo dos piezas y la tercera está en camino.',
  },
]

/* ------------------------------------------------------------------ */
/* Perfil de la diseñadora (texto de ejemplo, reemplazable)            */
/* ------------------------------------------------------------------ */

export const DESIGNER: DesignerProfile = {
  name: 'Anays Vargas',
  role: 'Diseñadora y fundadora de ANV·BAR',
  bio: 'Diseñadora caribeña de oficio y de nacimiento: crea piezas femeninas, ligeras y elegantes, cosidas a mano bajo pedido.',
  collection: {
    name: 'RUBRA',
    story:
      'RUBRA nace del rojo de la trinitaria, la flor de tres pétalos que enciende los jardines del Caribe. Tres pétalos, tres intensidades y una misma ligereza: cada pieza atrapa ese juego de color y aire para vestir el día y la noche de quien la lleva.',
  },
  claim: 'Donde la ligereza se convierte en elegancia',
}

/* ------------------------------------------------------------------ */
/* Utilidad de formato (usada por la interfaz de catálogo)             */
/* ------------------------------------------------------------------ */

/**
 * Formatea un precio COP a "$250.000" (sin decimales).
 * El precio se guarda como entero; esta función solo agrega el separador
 * de miles y el símbolo de pesos.
 */
export function formatCOP(priceCOP: number): string {
  return '$' + priceCOP.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}