/**
 * ANV·BAR — Storefront contact channels (Supabase with bundled fallback).
 *
 * Channels are fetched once per page load from public.contact_channels and
 * stored in a module singleton, mirroring PRODUCTS in catalog.ts, then kept
 * LIVE through a shared realtime subscription: any INSERT/UPDATE/DELETE from
 * the admin panel (#/admin/contacto) triggers an authoritative refetch that
 * swaps the singleton and notifies subscribers. Ordering: sort_order ASC
 * with created_at as tie-break (same contract as the admin list). If a read
 * fails or returns zero rows, the singleton keeps serving content/contact.json
 * through its existing strict-validation loader (src/storefront/contact-data.ts)
 * — the JSON remains the fallback source of record, so the public contact
 * section never renders empty.
 */

import type { RealtimeChannel } from '@supabase/supabase-js'
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

/* ------------------------------------------------------------------ */
/* Realtime sync (public.contact_channels)                             */
/* ------------------------------------------------------------------ */

type ContactChannelsListener = () => void

const listeners = new Set<ContactChannelsListener>()
let realtimeSubscribers = 0
let realtimeChannel: RealtimeChannel | null = null

/**
 * Authoritative refetch for realtime events: replaces the singleton when the
 * DB answers with rows and notifies every subscriber. An empty result or a
 * failed read keeps whatever the singleton currently serves (bundled JSON
 * fallback or last good DB rows), so the section never renders empty.
 */
async function refreshContactChannels(): Promise<void> {
  try {
    const rows = await fetchChannels()
    if (rows.length === 0) return
    channels = rows
    source = 'db'
    listeners.forEach((listener) => listener())
  } catch {
    // Network/RLS failure: keep serving the current singleton untouched.
  }
}

/**
 * Subscribes to INSERT/UPDATE/DELETE on public.contact_channels through ONE
 * shared module-level channel: the first subscriber creates it and removing
 * the last subscription tears it down (same removeChannel-on-cleanup
 * convention as the component-owned channels elsewhere, but safe for the
 * multiple consumers of this singleton — Contact and the chat widget). Every
 * event triggers an ordered refetch that swaps the singleton and notifies
 * listeners; getContactChannels() readers (chatbot answers included) see
 * admin edits live without reloading.
 */
export function subscribeContactChannels(listener: ContactChannelsListener): () => void {
  listeners.add(listener)
  realtimeSubscribers += 1
  if (!realtimeChannel) {
    realtimeChannel = supabase
      .channel('storefront-contact-channels')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_channels' },
        () => {
          void refreshContactChannels()
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') console.warn('[contact] realtime channel error')
      })
  }
  let unsubscribed = false
  return () => {
    if (unsubscribed) return
    unsubscribed = true
    listeners.delete(listener)
    realtimeSubscribers -= 1
    if (realtimeSubscribers === 0 && realtimeChannel) {
      void supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }
}
