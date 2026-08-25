/**
 * ANV·BAR — Static content for the admin help system (#/admin/ayuda).
 *
 * Deliberately bundled in code: the guide must render even with Supabase
 * unreachable, so the content itself performs NO database reads (only the
 * owner contact block at the end of the page is live). Content is a plain
 * structured array (sections → entries) rendered generically by HelpPage;
 * editing or extending the guide means touching THIS file only.
 *
 * Accuracy contract: every claim here mirrors real component behavior
 * (ProductForm, ImportProducts, ReviewsManager, TestimonialsManager,
 * DesignerProfileManager, ContactChannelsManager, storefront favorites and
 * reviews). If one of those changes behavior, update the matching entry.
 *
 * Language: neutral Spanish, no emojis.
 */

export type HelpEntry = {
  /** Entry heading. */
  title: string
  /** Plain paragraphs shown under the heading. */
  paragraphs?: string[]
  /** Bullet list shown after the paragraphs. */
  bullets?: string[]
  /** Deep link to the admin route this entry explains. */
  href?: string
  /** Label for the deep link button (default "Abrir"). */
  hrefLabel?: string
  /** Expandable worked example ("Ver un ejemplo"), collapsed by default. */
  example?: HelpExample
}

/** A collapsible, concrete walkthrough attached to a help entry. */
export type HelpExample = {
  /** Lead-in paragraph shown when the example is expanded. */
  intro?: string
  /** Field/value walkthrough for form-style examples. */
  fields?: { label: string; value: string }[]
  /** Table example; the first row is the header row. */
  table?: { headers: string[]; rows: string[][] }
  /** Downloadable companion file shown above the example content. */
  download?: { label: string; href: string; note: string }
}

export type HelpSection = {
  /** Stable id used by the in-page section navigation (prefixed by HelpPage). */
  id: string
  title: string
  intro: string
  entries: HelpEntry[]
}

const DEFAULT_HREF_LABEL = 'Abrir'

export function helpHrefLabel(entry: HelpEntry): string {
  return entry.hrefLabel ?? DEFAULT_HREF_LABEL
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'tienda-publica',
    title: 'La tienda pública',
    intro:
      'Así ven la tienda las personas que entran a la página. Conocer esta parte ayuda a entender el efecto de lo que se publica desde el panel.',
    entries: [
      {
        title: 'El catálogo',
        paragraphs: [
          'Al entrar, la visitante ve la portada con las piezas marcadas como novedad y, más abajo, el catálogo completo: foto, categoría, nombre y precio de cada producto. Puede filtrar por categoría, cambiar el orden y abrir una vista rápida o la ficha completa, donde aparecen todas las fotos por color, las tallas disponibles, la tela, los cuidados y las reseñas de otras clientas.',
          'Cada tarjeta muestra la etiqueta «Bajo pedido 3-5 días»: toda pieza se confecciona al confirmar el pedido, no hay stock ni ofertas.',
        ],
      },
      {
        title: 'Favoritos (los corazones)',
        paragraphs: [
          'El corazón de cada producto guarda la pieza en la lista personal de favoritos (#/favoritos). Esa lista vive únicamente en el navegador de cada visitante: no requiere cuenta ni registro, así que si cambia de dispositivo la lista no la acompaña.',
          'Además, cada corazón alimenta un contador público: la tarjeta muestra cuántas personas marcaron esa pieza como favorita («8 favoritos»). Es prueba social para las demás visitantas; el contador propio de nadie se muestra, solo el total.',
        ],
      },
      {
        title: 'Reseñas de productos',
        paragraphs: [
          'En la ficha de cada producto cualquier visitante puede dejar una reseña: elige de 1 a 5 estrellas, escribe su experiencia (mínimo 10 caracteres) y opcionalmente su nombre o ciudad. Acepta los términos y la review se publica enseguida, sin revisión previa.',
          'Por eso existe la moderación: desde Comentarios en este panel puede responder en nombre de la marca o eliminar lo que no deba permanecer publicado.',
        ],
      },
      {
        title: 'Testimonios',
        paragraphs: [
          'La sección de testimonios de la tienda muestra relatos seleccionados por la marca: no se escriben solos. Todo testimonio visible se creó desde este panel, ya sea directamente en Testimonios o publicando como testimonio alguna reseña de producto.',
        ],
      },
      {
        title: 'Pedidos por WhatsApp',
        paragraphs: [
          'La tienda no tiene carrito ni pago en línea. Cuando una visitante quiere una pieza, toca el botón de WhatsApp y le escribe a la marca por mensaje de texto para coordinar el pedido y el pago. La tienda nunca ofrece llamadas: todo es texto.',
          'Los precios que ve son los definidos aquí, en pesos colombianos enteros.',
        ],
      },
      {
        title: 'Asistente de chat',
        paragraphs: [
          'En la esquina inferior hay un globo de chat con respuestas automáticas sobre cómo pedir, tiempos de entrega, envíos y canales de contacto. Es un ayudante de primeras preguntas, no reemplaza el pedido real por WhatsApp.',
        ],
      },
    ],
  },
  {
    id: 'panel-administracion',
    title: 'El panel de administración',
    intro:
      'Regla de oro: todo cambio se publica solo. Al guardar, la tienda lo refleja al instante gracias a la actualización en vivo; no hace falta reconstruir ni desplegar nada.',
    entries: [
      {
        title: 'Productos (#/admin/productos)',
        href: '#/admin/productos',
        paragraphs: ['Listado completo del catálogo con dos ayudas para encontrar rápido:'],
        bullets: [
          'Filtro por categoría y órdenes de presentación (igual al catálogo, nombre A-Z o precio).',
          'Editar abre el formulario con los datos cargados; Eliminar pide confirmación y borra también las fotos subidas de ese producto. No se puede deshacer.',
        ],
      },
      {
        title: 'Nuevo y editar producto',
        href: '#/admin/productos/nuevo',
        hrefLabel: 'Abrir nuevo producto',
        paragraphs: [
          'El formulario se divide en cuatro bloques y valida todo antes de guardar: si falta algo, los errores aparecen agrupados en pantalla y nada llega a la base hasta corregirlos.',
        ],
        bullets: [
          'Identificador (slug): se genera solo desde el nombre (minúsculas y guiones), puede ajustarse antes del primer guardado pero después queda fijo para siempre.',
          'Precio: número entero de pesos, sin decimales ni puntos. Escriba 250000; debajo del campo se ve cómo se mostrará: $250.000.',
          'Categoría: lista fija de siete opciones (Vestidos, Conjuntos, Camisas, Faldas, Pantalones, Sets, Accesorios); no se pueden crear otras.',
          'Orden de presentación (opcional): 0 va primero; sin número, la pieza va después de las numeradas.',
          'Novedad: marcada, la pieza sale en la cinta y en la portada.',
          'Datos técnicos: tela, cuidado y descripción tal como se quieren mostrar.',
          'Tallas: se agregan una a una (hay atajos XS a XL y Único). Los Accesorios siempre se guardan con la talla Único.',
          'Variantes de color: una por combinación real de la prenda, con nombre y hex tomado del selector de color. El hex debe representar el color verdadero de la tela, no un color inventado.',
          'Fotos por variante: una principal y varias adicionales; JPG, PNG, WEBP o GIF, máximo 5 MB por archivo. El texto de la foto (label) es obligatorio cuando hay imagen: sirve de descripción alternativa.',
        ],
        example: {
          intro: 'Así se vería una pieza bien diligenciada en el formulario:',
          fields: [
            { label: 'Nombre', value: 'Vestido Ceremonia Marfil' },
            { label: 'Identificador (slug)', value: 'vestido-ceremonia-marfil — se genera solo desde el nombre' },
            { label: 'Precio', value: '320000 — debajo del campo se ve la vista previa: $320.000' },
            { label: 'Categoría', value: 'Vestidos' },
            { label: 'Orden', value: '1 — va primera en el catálogo' },
            { label: 'Novedad', value: 'Marcada — sale en la cinta de la portada' },
            { label: 'Tela y cuidados', value: 'Lino mezclado — Lavado en frío, secar en sombra, planchar tibio del revés.' },
            { label: 'Tallas', value: 'S, M, L' },
            { label: 'Variantes', value: 'Marfil #F5F0E6 y Terracota #C86F4A, cada una con su foto principal' },
          ],
        },
      },
      {
        title: 'Importar productos (#/admin/importar)',
        href: '#/admin/importar',
        hrefLabel: 'Abrir importación',
        paragraphs: [
          'Para cargar varias piezas a la vez: suba un archivo .xlsx/.xls/.csv o pegue la planilla como texto (una fila por producto). El identificador se genera solo desde el nombre y las imágenes van como dirección web pública por variante; sin URL, la pieza se ve con placeholder hasta subirle foto desde el formulario.',
        ],
        bullets: [
          'Con encabezados, la primera línea puede ser: nombre;categoria;precio;editorial;tela;cuidados;tallas;variantes;es_nuevo;orden. Sin encabezados, las columnas deben seguir ese mismo orden.',
          'El precio tolera formato de moneda: $420.000 se interpreta bien.',
          'Variantes: «Nombre #códigohex [URL de foto]» separadas por punto y coma; ejemplo: Marfil #F5E6C8 https://…; Negro #111111.',
          'es_nuevo acepta si/no; orden es opcional.',
          'Antes de importar siempre hay previsualización: la tabla marca cada fila como Lista o muestra su error con las mismas reglas del formulario. Solo se importan las filas sin errores; las fallidas se reportan línea por línea sin abortar el resto del lote.',
        ],
        example: {
          intro: 'La forma más simple de cargar varias piezas: descargue la plantilla, rellénela y súbala tal cual.',
          download: {
            label: 'Descargar plantilla de Excel',
            href: '/plantilla-productos-anvbar.xlsx',
            note: 'Trae los 10 encabezados listos y dos filas de ejemplo: basta reemplazarlas por las piezas nuevas y subir el archivo en Importar. El precio puede escribirse como 320000 o $320.000, ambos se interpretan bien.',
          },
          table: {
            headers: ['nombre', 'categoria', 'precio', 'editorial', 'tela', 'cuidados', 'tallas', 'variantes', 'es_nuevo', 'orden'],
            rows: [
              [
                'Vestido Ceremonia Marfil',
                'Vestidos',
                '320000',
                'Pieza de ceremonia con caída fluida.',
                'Lino mezclado',
                'Lavado en frío, secar en sombra.',
                'S, M, L',
                'Marfil #F5F0E6; Terracota #C86F4A',
                'sí',
                '1',
              ],
            ],
          },
        },
      },
      {
        title: 'Comentarios (#/admin/comentarios)',
        href: '#/admin/comentarios',
        paragraphs: [
          'Aquí se modera las reseñas que dejan las visitantas. La lista trae todos los comentarios de todos los productos, del más reciente al más antiguo, y se actualiza sola cuando entra uno nuevo.',
          'El aviso numérico (badge) junto a Comentarios cuenta las reviews que aún no ha visto en este navegador; al entrar a la sección vuelve a cero.',
        ],
        bullets: [
          'Responder: escribe la respuesta pública de ANV·BAR (hasta 1000 caracteres). Se muestra en la ficha del producto como «ANV·BAR respondió».',
          'Publicar como testimonio: copia el comentario a la sección de testimonios sin borrar la review original, que sigue listada y moderable.',
          'Eliminar: borra la review definitivamente, con confirmación previa.',
        ],
      },
      {
        title: 'Testimonios (#/admin/testimonios)',
        href: '#/admin/testimonios',
        paragraphs: [
          'Creación, edición y borrado de los testimonios que se muestran en la tienda. Cada uno lleva nombre y texto; la validación ocurre antes de guardar y los cambios se reflejan en vivo en la sección pública.',
        ],
      },
      {
        title: 'Diseñadora (#/admin/disenadora)',
        href: '#/admin/disenadora',
        paragraphs: [
          'Edita el perfil de la diseñadora que publica la tienda: nombre, rol, biografía, nombre e historia de la colección y la frase de marca. Son seis campos con límites de caracteres indicados en el formulario; al guardar, la sección «La diseñadora» se actualiza en vivo.',
        ],
      },
      {
        title: 'Contacto (#/admin/contacto)',
        href: '#/admin/contacto',
        paragraphs: [
          'Administra los canales oficiales que ve la tienda (WhatsApp, Instagram, Facebook Marketplace y otros). Cada canal tiene etiqueta, usuario visible, enlace y una nota opcional; la etiqueta sugiere opciones conocidas pero acepta cualquiera.',
          'El orden es fijo por creación: los canales nuevos quedan al final de la lista. Lo que se guarda aquí alimenta la sección de contacto y también las respuestas del asistente de chat.',
        ],
      },
      {
        title: 'Piezas más deseadas (dashboard)',
        paragraphs: [
          'En la parte inferior del panel principal aparece el ranking de las cinco piezas con más favoritos entre todas las visitantas. Cada fila muestra la posición, la foto, el nombre, la categoría, el precio y la cantidad de favoritos acumulados.',
          'El ranking se actualiza en vivo: cuando una visitante toca el corazón de un producto, el administrador lo ve reflejado al instante, sin recargar la página.',
          'Hacer clic en el nombre de una pieza abre directamente su formulario de edición.',
        ],
      },
      {
        title: 'Reglas que conviene recordar',
        paragraphs: ['Cuatro reglas evitan casi todos los tropiezos del día a día:'],
        bullets: [
          'Precios siempre en pesos enteros: 250000, jamás 250.000,50.',
          'Las categorías son siete y fijas; si una pieza no calza en ninguna, revise con la desarrolladora antes de inventar una.',
          'Colores hex reales: cada variante debe pintarse con el color verdadero de la tela.',
          'Todo cambio se publica solo y al instante; no hay que avisarle a nadie ni reconstruir la página.',
        ],
      },
    ],
  },
  {
    id: 'si-algo-se-rompe',
    title: 'Si algo se rompe',
    intro:
      'Síntomas comunes y qué hacer. Casi todo se resuelve recargando la página; lo que no, termina en un mensaje a la desarrolladora.',
    entries: [
      {
        title: 'La página carga pero faltan datos',
        paragraphs: [
          'Si el panel o la tienda abren pero la información no aparece o se ve desactualizada, probablemente hay un corte momentáneo de conexión con la base de datos. Espere unos segundos y recargue la página (F5). Mientras tanto, algunas secciones muestran información de respaldo guardada en la página (por ejemplo contacto o perfil), así que ver datos antiguos no significa que se haya perdido nada.',
          'Si el catálogo completo no logra cargar, la tienda muestra un aviso con botón Reintentar: tóquelo o espere y recargue.',
        ],
      },
      {
        title: 'No puedo entrar al panel',
        paragraphs: [
          'Primero verifique el correo y la contraseña, y que sea la cuenta autorizada (solo cuentas aprobadas pueden administrar). Si olvidó la contraseña, use el enlace de recuperación del login: lleva a la página de recuperación (#/recovery) y llega un correo con los pasos para definir una nueva.',
          'Si el correo de recuperación no llega o el acceso sigue fallando, anote el mensaje exacto que muestra la pantalla y contáctese con la desarrolladora.',
        ],
      },
      {
        title: 'No puedo guardar o subir fotos',
        paragraphs: [
          'Revise que cada archivo sea JPG, PNG, WEBP o GIF y pese menos de 5 MB; ese es el límite por foto. Si el formulario marca errores, corríjalos donde indica: nada se guarda hasta que todo esté válido. Si aparece un mensaje de error del sistema, cópielo tal cual para reportarlo.',
        ],
      },
      {
        title: 'Hice un cambio y no se ve',
        paragraphs: [
          'Lo normal es que el cambio aparezca solo y al instante, incluso en pantallas ya abiertas. Si no lo ve: recargue la pestaña de la tienda (F5) y espere un minuto antes de volver a intentar. Un cambio guardado está publicado; si sigue sin verse tras recargar, ahí sí avise.',
        ],
      },
      {
        title: 'Cuándo contactar a la desarrolladora',
        paragraphs: [
          'Para cualquier cosa fuera de esta guía: errores persistentes, dudas sobre una pieza concreta o cambios que requieran tocar el código (como agregar categorías nuevas). Idealmente adjunte una captura de pantalla y el texto exacto del error. Abajo están los datos de contacto directos.',
        ],
      },
    ],
  },
]
