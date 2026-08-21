/**
 * ANV·BAR — Storefront contact channels (Supabase with bundled fallback).
 *
 * Channels are fetched ONCE per page load from public.contact_channels and
 * stored in a module singleton, mirroring PRODUCTS in catalog.ts. Ordering:
 * sort_order ASC with created_at as tie-break (same contract as the admin
 * list). If the read fails or returns zero rows, the singleton keeps serving
 * content/contact.json through its existing strict-validation loader
 * (src/storefront/contact-data.ts) — the JSON remains the fallback source of
 * record, so the public contact section never renders empty.
 */

import { supabase } from '../shared/supabase'
import { CONTACT_CHANNELS } from '../storefront/contact-data'

/** Shape consumed by the storefront: same contract as contact-data's channels. */
export type ContactChannelView = {
  label: string
  handle: string
  href: string
  note?: string
}

/** Where the served channels came from: the database or the bundled JSON. */
export type ContactChannelsSource = 'db' | 'fallback'

/** Raw snake_case projection of a public.contact_channels row. */
type ChannelRow = {
  label: string
  handle: string | null
  href: string
  note: string | null
}

function mapChannelRow(row: ChannelRow): ContactChannelView {
  return {
    label: row.label,
    // A cleared handle renders as empty text, exactly like an omitted field.
    handle: row.handle ?? '',
    href: row.href,
    ...(row.note ? { note: row.note } : {}),
  }
}

let channels: readonly ContactChannelView[] = CONTACT_CHANNELS
let source: ContactChannelsSource = 'fallback'
let inflight: Promise<ContactChannelsSource> | null = null

async function fetchChannels(): Promise<ContactChannelView[]> {
  const { data, error } = await supabase
    .from('contact_channels')
    .select('label,handle,href,note')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapChannelRow(row as ChannelRow))
}

/**
 * Starts the single DB read (concurrent callers share the same request) and
 * resolves with the resulting source flag. Any failure — network error, RLS
 * denial, or a table that answers with zero rows — keeps the bundled fallback
 * in place instead of breaking the page.
 */
export function ensureContactChannelsLoaded(): Promise<ContactChannelsSource> {
  if (!inflight) {
    inflight = fetchChannels()
      .then((rows) => {
        if (rows.length > 0) {
          channels = rows
          source = 'db'
        }
        return source
      })
      .catch(() => source)
  }
  return inflight
}

/** Current channels for rendering (bundled content until the DB read lands). */
export function getContactChannels(): readonly ContactChannelView[] {
  return channels
}

/** Source of the current channels: 'db' once loaded from Supabase, else 'fallback'. */
export function getContactChannelsSource(): ContactChannelsSource {
  return source
}
