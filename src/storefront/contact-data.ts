/**
 * ANV·BAR — Bundled contact channels (static fallback).
 *
 * LIVE SOURCE: the public.contact_channels table in Supabase, managed from
 * the admin panel (#/admin/contacto) and loaded once per page by
 * src/catalog/contactChannels.ts. This module keeps the strict load of
 * content/contact.json and is ONLY the fallback used when that DB read fails
 * or comes back empty; the JSON file stays the fallback source of record.
 *
 * The file accepts a root array or an object with the "contact" key (the
 * shape Decap CMS writes for file collections).
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