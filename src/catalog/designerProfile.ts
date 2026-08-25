/**
 * ANV·BAR — Designer profile (Supabase with bundled fallback).
 *
 * The "La diseñadora" section reads a module singleton seeded from the
 * bundled DESIGNER constant, then swaps to the live database row once a
 * fetch lands — mirroring contactChannels.ts. The table holds exactly ONE
 * row (id = 1) whose lifecycle belongs to migrations: there is no runtime
 * create/delete surface, only admin UPDATEs. If the read fails (network
 * down, RLS denial, or the table not existing before the migration runs),
 * the singleton silently keeps serving content/designer.json, so the
 * storefront section never renders blank.
 */

import { supabase } from '../shared/supabase'
import { DESIGNER, type DesignerProfile } from './catalog'

/** Raw snake_case projection of a public.designer_profile row. */
export type DesignerProfileRow = {
  id: number
  name: string
  role: string
  bio: string
  collection_name: string
  collection_story: string
  claim: string
  updated_at: string
}

/** Maps the flat DB row onto the nested view contract: collection_name/story flatten into `collection`. */
export function mapDesignerProfileRow(row: DesignerProfileRow): DesignerProfile {
  return {
    name: row.name,
    role: row.role,
    bio: row.bio,
    collection: { name: row.collection_name, story: row.collection_story },
    claim: row.claim,
  }
}

/**
 * Max char_length per column — mirrors the migration CHECKs so admin-side
 * validation has a single source of truth shared with the database.
 */
export const DESIGNER_PROFILE_BOUNDS = {
  maxName: 80,
  maxRole: 120,
  maxBio: 1000,
  maxCollectionName: 80,
  maxCollectionStory: 2000,
  maxClaim: 200,
} as const

/** Editable payload shape used by the admin form (six flat fields). */
export type DesignerProfileInput = {
  name: string
  role: string
  bio: string
  collectionName: string
  collectionStory: string
  claim: string
}

let profile: DesignerProfile = DESIGNER
let source: 'db' | 'fallback' = 'fallback'
let inflight: Promise<'db' | 'fallback'> | null = null

async function fetchDesignerProfile(): Promise<DesignerProfile> {
  const { data, error } = await supabase
    .from('designer_profile')
    .select('name,role,bio,collection_name,collection_story,claim')
    .eq('id', 1)
    .single()
  if (error) throw new Error(error.message)
  return mapDesignerProfileRow(data as DesignerProfileRow)
}

/**
 * ALWAYS issues a fresh DB read (never cached): realtime handlers and the
 * admin manager rely on it for up-to-the-second values. Updates the
 * singleton on success and THROWS on failure — callers decide how to handle
 * errors.
 */
export async function loadDesignerProfile(): Promise<DesignerProfile> {
  const fresh = await fetchDesignerProfile()
  profile = fresh
  source = 'db'
  return fresh
}

/**
 * Starts the single DB read (concurrent callers share the same request) and
 * resolves with the resulting source flag. Any failure — network error, RLS
 * denial, or a table that does not exist yet — keeps the bundled fallback in
 * place instead of breaking the page.
 */
export function ensureDesignerProfileLoaded(): Promise<'db' | 'fallback'> {
  if (!inflight) {
    inflight = loadDesignerProfile()
      .then(() => source)
      .catch(() => source)
  }
  return inflight
}

/** Current profile for rendering (bundled JSON until the DB read lands). */
export function getDesignerProfile(): DesignerProfile {
  return profile
}

/**
 * Persists an admin edit against the singleton row (id = 1). THROWS on
 * failure — the caller surfaces server/RLS messages to the admin.
 */
export async function updateDesignerProfile(input: DesignerProfileInput): Promise<void> {
  const { error } = await supabase
    .from('designer_profile')
    .update({
      name: input.name,
      role: input.role,
      bio: input.bio,
      collection_name: input.collectionName,
      collection_story: input.collectionStory,
      claim: input.claim,
    })
    .eq('id', 1)
  if (error) throw new Error(error.message)
}
