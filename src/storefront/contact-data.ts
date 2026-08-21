/**
 * ANV·BAR — Canales de contacto oficiales (fuente única, verificable en
 * harness node). Handles exactos exigidos por el spec contact.
 *
 * Los valores se cargan desde content/contact.json (editable desde el admin).
 * El archivo admite un arreglo raíz o un objeto con la clave "contact" (la
 * forma que usa Decap CMS al guardar file collections).
 */

export type ContactChannel = {
  label: string
  /** Texto exacto mostrado (handle o número, tal como exige el spec). */
  handle: string
  href: string
  note?: string
}

const contactEntries = Object.entries(
  import.meta.glob('../../content/contact.json', { eager: true, import: 'default' }),
)
if (contactEntries.length === 0) {
  throw new Error('[contact] No se encontró content/contact.json. Es un archivo de contenido obligatorio.')
}
const rawChannels = contactEntries[0][1]

let channels: unknown[] | null = null
if (Array.isArray(rawChannels)) {
  channels = rawChannels
} else if (
  typeof rawChannels === 'object' &&
  rawChannels !== null &&
  Array.isArray((rawChannels as Record<string, unknown>).contact)
) {
  channels = (rawChannels as Record<string, unknown>).contact as unknown[]
}
if (channels === null) {
  throw new Error(
    '[contact] content/contact.json debe ser una lista de canales o un objeto con la clave "contact".',
  )
}

const parsedChannels: ContactChannel[] = channels.map((item, index) => {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw new Error(`[contact] El canal #${index + 1} de content/contact.json debe ser un objeto.`)
  }
  const channel = item as Record<string, unknown>
  const label = channel.label
  const handle = channel.handle
  const href = channel.href
  if (
    typeof label !== 'string' ||
    label.trim() === '' ||
    typeof handle !== 'string' ||
    handle.trim() === '' ||
    typeof href !== 'string' ||
    href.trim() === ''
  ) {
    throw new Error(`[contact] El canal #${index + 1} necesita "label", "handle" y "href" no vacíos.`)
  }
  const parsed: ContactChannel = { label, handle, href }
  if (typeof channel.note === 'string' && channel.note !== '') {
    parsed.note = channel.note
  }
  return parsed
})

export const CONTACT_CHANNELS: ContactChannel[] = parsedChannels