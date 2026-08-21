import type { ValidationIssue } from './products'
import { supabase } from '../shared/supabase'

/**
 * Admin data layer for public.contact_channels (slice A of
 * admin-contact-channels).
 *
 * Uses the SAME anon browser client exported by src/shared/supabase.ts;
 * security is guaranteed server-side by RLS (every write policy is gated on
 * the is_admin() allowlist in the migration), never by the client. Insert and
 * update chain .select('*').single(), so a non-allowlisted session — which
 * affects 0 rows under RLS — surfaces as a thrown PostgREST error instead of
 * a silent success, mirroring src/admin/products.ts.
 *
 * Seed source of record: content/contact.json (same four channels).
 */

export type ContactChannel = {
  id: string
  label: string
  /** Phone digits (WhatsApp), @handle or free text shown next to the label. */
  handle: string | null
  href: string
  note: string | null
  sortOrder: number
}

/** Raw snake_case row as stored/returned by Supabase (mirror of the DDL). */
type ContactChannelRow = {
  id: string
  label: string
  handle: string | null
  href: string
  note: string | null
  sort_order: number
}

/** Canonical admin form payload (camelCase, ready to validate and persist). */
export type ContactChannelInput = {
  label: string
  handle: string | null
  href: string
  note: string | null
  sortOrder: number
}

/**
 * Preset labels offered by the admin form select. Presentation guidance only,
 * NOT a constraint: validateContactChannel accepts any non-empty label, and
 * the manager prepends a stored label missing from this list so legacy rows
 * (e.g. the original 'Diseñadora' seed) stay visible and editable.
 */
export const CHANNEL_LABEL_OPTIONS: string[] = [
  'WhatsApp',
  'Instagram',
  'Facebook Marketplace',
  'Correo',
  'TikTok',
  'Otros',
]

/* ------------------------------------------------------------------ */
/* Row mapping                                                        */
/* ------------------------------------------------------------------ */

function mapChannelRow(row: ContactChannelRow): ContactChannel {
  return {
    id: row.id,
    label: row.label,
    handle: row.handle,
    href: row.href,
    note: row.note,
    sortOrder: row.sort_order,
  }
}

function toChannelRow(input: ContactChannelInput): Omit<ContactChannelRow, 'id'> {
  return {
    label: input.label.trim(),
    handle: input.handle?.trim() ? input.handle.trim() : null,
    href: input.href.trim(),
    note: input.note?.trim() ? input.note.trim() : null,
    sort_order: input.sortOrder,
  }
}

/* ------------------------------------------------------------------ */
/* Validación                                                         */
/* ------------------------------------------------------------------ */

/** wa.me links must be E.164 digits only after the slash: no "+", no spaces. */
const WA_ME_PATH = /^\/\d{7,15}$/

/**
 * Valida el payload ANTES de escribir: etiqueta obligatoria (1..40), enlace
 * https válido; si el host es wa.me la ruta debe ser el número internacional
 * sin «+» (los pedidos se atienden solo por mensaje de texto, sin llamadas);
 * usuario y nota opcionales con tope de caracteres; orden entero >= 0.
 * Devuelve la lista de errores por campo; vacía = ok. Un payload inválido
 * jamás toca la base.
 */
export function validateContactChannel(input: ContactChannelInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const label = input.label.trim()
  if (label === '') {
    issues.push({ field: 'label', message: 'Etiqueta — es obligatoria.' })
  } else if (label.length > 40) {
    issues.push({ field: 'label', message: 'Etiqueta — puede tener hasta 40 caracteres.' })
  }

  const hrefRaw = input.href.trim()
  let parsedUrl: URL | null = null
  try {
    parsedUrl = hrefRaw === '' ? null : new URL(hrefRaw)
  } catch {
    parsedUrl = null
  }
  if (hrefRaw === '') {
    issues.push({ field: 'href', message: 'Enlace — es obligatorio.' })
  } else if (!parsedUrl || parsedUrl.protocol !== 'https:') {
    issues.push({
      field: 'href',
      message: 'Enlace — debe ser una dirección segura que comience con https://',
    })
  } else if (parsedUrl.hostname === 'wa.me' && !WA_ME_PATH.test(parsedUrl.pathname)) {
    issues.push({
      field: 'href',
      message:
        'Enlace de WhatsApp — use el formato internacional sin el signo «+», por ejemplo https://wa.me/573186424021. Los pedidos se atienden solo por mensaje de texto, sin llamadas.',
    })
  }

  const handle = input.handle?.trim() ?? ''
  if (handle.length > 60) {
    issues.push({ field: 'handle', message: 'Usuario o cuenta — puede tener hasta 60 caracteres.' })
  }

  const note = input.note?.trim() ?? ''
  if (note.length > 140) {
    issues.push({ field: 'note', message: 'Nota — puede tener hasta 140 caracteres.' })
  }

  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    issues.push({
      field: 'sortOrder',
      message: 'Orden — debe ser un número entero mayor o igual a 0.',
    })
  }

  return issues
}

/* ------------------------------------------------------------------ */
/* Persistencia                                                       */
/* ------------------------------------------------------------------ */

/** Channels ordered for the storefront and the admin list: sort_order asc, creation order as tie-break. */
export async function listChannels(): Promise<ContactChannel[]> {
  const { data, error } = await supabase
    .from('contact_channels')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapChannelRow(row as ContactChannelRow))
}

export async function createChannel(input: ContactChannelInput): Promise<ContactChannel> {
  const row = toChannelRow(input)
  const { data, error } = await supabase.from('contact_channels').insert(row).select('*').single()
  if (error) throw new Error(error.message)
  return mapChannelRow(data as ContactChannelRow)
}

export async function updateChannel(id: string, input: ContactChannelInput): Promise<ContactChannel> {
  const row = toChannelRow(input)
  const { data, error } = await supabase
    .from('contact_channels')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapChannelRow(data as ContactChannelRow)
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabase.from('contact_channels').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
