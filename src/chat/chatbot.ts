import { CATEGORIES } from '../catalog/catalog'
import { CONTACT_CHANNELS } from '../storefront/contact-data'
import { WHATSAPP_NUMBER, SHIPPING_NOTICE } from '../storefront/whatsapp'

export type ChatAnswer = {
  text: string
  link?: { label: string; href: string }
}

export type ChatRule = {
  id: string
  keywords: string[]
  title: string
  answer: string | ((input: string) => string)
  link?: { label: string; href: string }
}

const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`

const whatsappHandle =
  CONTACT_CHANNELS.find((channel) => channel.label === 'WhatsApp')?.handle ?? '3186424021'
const instagramHandle =
  CONTACT_CHANNELS.find((channel) => channel.label === 'Instagram')?.handle ?? '@anv.bar_av'
const designerHandle =
  CONTACT_CHANNELS.find((channel) => channel.label === 'Diseñadora')?.handle ?? '@anysval_'

/**
 * Rule-based Q&A for the ANV·BAR chat widget. Each rule matches on plain
 * substring keyword hits; the fallback rule (empty keywords) answers every
 * unmatched input and MUST stay last in the array.
 */
export const RULES: ChatRule[] = [
  {
    id: 'order',
    title: 'Pedidos',
    keywords: ['pedido', 'pedir', 'orden', 'compra', 'comprar', 'encargo', 'encargar', 'quiero', 'quisiera'],
    answer:
      'Gracias por su interés. Los pedidos de ANV·BAR se tramitan por WhatsApp con un mensaje de texto: indique la pieza, el color y la talla que desea, y la diseñadora le confirmará la disponibilidad. Las piezas se elaboran a mano bajo pedido.',
    link: { label: 'Pedir por WhatsApp', href: WHATSAPP_LINK },
  },
  {
    id: 'shipping',
    title: 'Envíos',
    keywords: [
      'envío',
      'envio',
      'envíos',
      'envios',
      'entrega',
      'entregas',
      'demora',
      'tarda',
      'tardan',
      'cuánto tarda',
      'cuanto tarda',
      'tiempo de entrega',
    ],
    answer: `${SHIPPING_NOTICE}. Las piezas se confeccionan a mano después de confirmar el pedido, por eso el tiempo de entrega. Si su consulta es urgente, puede escribirnos directamente por WhatsApp.`,
    link: { label: 'Consultar por WhatsApp', href: WHATSAPP_LINK },
  },
  {
    id: 'sizes',
    title: 'Tallas y medidas',
    keywords: ['talla', 'tallas', 'medida', 'medidas', 'tabla de tallas', 'mi talla'],
    answer:
      'Cada pieza tiene su tabla de tallas en la ficha del producto, ya que las medidas varían según la prenda. Si tiene dudas sobre cuál elegir, Anays la asesora por WhatsApp o por Instagram, y también puede escribir a la diseñadora en @anysval_.',
    link: { label: 'Diseñadora @anysval_', href: 'https://www.instagram.com/anysval_' },
  },
  {
    id: 'payment',
    title: 'Pagos',
    keywords: ['pago', 'pagos', 'pagar', 'forma de pago', 'medio de pago', 'transferencia', 'nequi'],
    answer:
      'El pago se acuerda directamente con la diseñadora por WhatsApp: no contamos con pasarela de pago en línea. Al confirmar su pedido, se coordina la forma de pago más cómoda para usted.',
    link: { label: 'Coordinar pago por WhatsApp', href: WHATSAPP_LINK },
  },
  {
    id: 'returns',
    title: 'Cambios y devoluciones',
    keywords: [
      'cambio',
      'cambios',
      'devolución',
      'devoluciones',
      'devolucion',
      'devolver',
      'garantía',
      'garantias',
      'reembolso',
      'cambiar',
    ],
    answer:
      'Como las piezas se hacen a mano, los cambios y devoluciones se coordinan con la diseñadora durante los primeros días después de la entrega. Escríbanos por WhatsApp y le indicamos el procedimiento.',
    link: { label: 'Escribir por WhatsApp', href: WHATSAPP_LINK },
  },
  {
    id: 'fabric',
    title: 'Telas y cuidados',
    keywords: ['tela', 'telas', 'cuidado', 'cuidados', 'lavar', 'lavado', 'lavandería', 'lavanderia', 'secar', 'planchar'],
    answer:
      'En la ficha de cada producto encontrará la tela utilizada y las instrucciones de cuidado recomendadas: cómo lavarla, secarla y conservarla. Puede consultarlas en la página de cada pieza.',
  },
  {
    id: 'catalog',
    title: 'Catálogo',
    keywords: ['catálogo', 'catalogo', 'categoría', 'categorias', 'categorías', 'producto', 'productos', 'colección'],
    answer: `Contamos con ${CATEGORIES.length} categorías: ${CATEGORIES.join(', ')}. Puede explorar todas las piezas en la sección "El catálogo" de la página principal.`,
  },
  {
    id: 'contact',
    title: 'Contacto',
    keywords: ['contacto', 'hablar', 'persona', 'humano', 'asesor', 'asesora', 'atención', 'atencion', 'urgente'],
    answer: `Puede escribirnos por WhatsApp al ${whatsappHandle} (siempre por mensaje de texto), o encontrarnos en Instagram ${instagramHandle}, Facebook Marketplace o con la diseñadora ${designerHandle}.`,
    link: { label: 'Abrir WhatsApp', href: WHATSAPP_LINK },
  },
  {
    id: 'greeting',
    title: 'Saludo',
    keywords: ['hola', 'buenas', 'buen día', 'buen dia', 'buenos días', 'buenos dias', 'hey', 'saludos', 'qué tal', 'que tal'],
    answer:
      '¡Hola! Bienvenida a ANV·BAR, prendas cosidas a mano en el Caribe colombiano. Soy el asistente virtual y puedo ayudarle con pedidos, envíos, tallas, pagos, cuidados y cambios. ¿En qué le puedo asistir?',
  },
  {
    id: 'pricing',
    title: 'Precios',
    keywords: [
      'precio',
      'precios',
      'cuánto cuesta',
      'cuanto cuesta',
      'cuánto vale',
      'cuanto vale',
      'costo',
      'costos',
      'cotización',
      'cotizacion',
      'cotizar',
    ],
    answer:
      'El precio de cada pieza aparece en su ficha del catálogo, y varía según el modelo, la tela y la confección. Si desea una cotización personalizada —por ejemplo para varias piezas— puede escribirnos por WhatsApp con la referencia de la prenda y la cantidad.',
    link: { label: 'Cotizar por WhatsApp', href: WHATSAPP_LINK },
  },
  {
    id: 'occasion',
    title: 'Ocasiones y eventos',
    keywords: [
      'matrimonio',
      'boda',
      'bodas',
      'ceremonia',
      'evento',
      'eventos',
      'ocasión',
      'ocasion',
      'ocasiones',
      'quinceañera',
      'quinceanera',
      'graduación',
      'graduacion',
      'fiesta',
      'fiestas',
      'vestido para',
      'look para',
      'qué me pongo',
      'que me pongo',
    ],
    answer:
      'En ANV·BAR encontrará piezas para eventos y ocasiones especiales: desde looks de día hasta vestidos de ceremonia, todos cosidos a mano. Para elegir la prenda ideal para su evento, Anays la asesora de forma personalizada por WhatsApp o Instagram.',
    link: { label: 'Asesoría para su evento', href: WHATSAPP_LINK },
  },
  {
    id: 'bulk',
    title: 'Pedidos por volumen',
    keywords: [
      'descuento',
      'descuentos',
      'volumen',
      'por mayor',
      'al mayor',
      'mayorista',
      'grupo',
      'grupal',
      'varias piezas',
      'varios',
      'cantidad',
      'cantidades',
      'catalogo completo',
    ],
    answer:
      'Cada pedido se cotiza de forma personalizada según la pieza, la tela y la cantidad. Para encargos por volumen —como varias piezas o un grupo para un evento— escríbanos por WhatsApp indicando cuántas prendas necesita y para qué fecha, y le damos una cotización.',
    link: { label: 'Cotizar por volumen', href: WHATSAPP_LINK },
  },
  {
    id: 'fallback',
    title: 'Sin coincidencia',
    keywords: [],
    answer:
      'Disculpe, no encontré una respuesta clara para esa consulta. Para que le atiendan de forma personalizada, le recomiendo escribirnos por WhatsApp y el equipo de ANV·BAR le responderá.',
    link: { label: 'Escribir por WhatsApp', href: WHATSAPP_LINK },
  },
]

/**
 * Resolve the best rule for a raw user input. Keywords are matched as plain
 * substrings on the lowercased, trimmed input. A rule wins by hit count; ties
 * break toward the longer matched keywords so that a multi-word intent beats a
 * short greeting that happens to share a token. The fallback rule (always the
 * last entry) answers when nothing else matches.
 */
export function answerFor(input: string): ChatAnswer {
  const normalized = input.toLowerCase().trim()
  let best: ChatRule | null = null
  let bestHits = 0
  let bestLength = 0

  for (const rule of RULES) {
    if (rule.keywords.length === 0) continue
    let hits = 0
    let matchedLength = 0
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        hits += 1
        matchedLength += keyword.length
      }
    }
    if (hits === 0) continue
    const wins = hits > bestHits || (hits === bestHits && matchedLength > bestLength)
    if (wins) {
      best = rule
      bestHits = hits
      bestLength = matchedLength
    }
  }

  const rule = best ?? RULES[RULES.length - 1]
  const text = typeof rule.answer === 'function' ? rule.answer(normalized) : rule.answer
  return rule.link ? { text, link: rule.link } : { text }
}