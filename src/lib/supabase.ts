import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env. ' +
      'The anon key is safe for the browser (RLS is the security boundary); ' +
      'never put SUPABASE_SERVICE_ROLE_KEY in a VITE_-prefixed variable.',
  )
}

/**
 * Browser client used by the catalog read path only (anon key, read-only by
 * RLS policy). All client-side fetches go through this single instance.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE en vez del implicit por defecto: el link de recovery (y cualquier
    // redirect) trae el code por QUERY real, preservando nuestro fragment del
    // hash router (#/recovery). Con implicit, GoTrue sobrescribe el fragment
    // con #access_token=... y rompería el ruteo por hash de la app.
    flowType: 'pkce',
  },
})