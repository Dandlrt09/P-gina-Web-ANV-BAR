/// <reference types="vite/client" />

/**
 * Ambient typing for Vite env vars consumed by the app.
 * tsconfig.app.json already includes `types: ["vite/client"]`; this merges
 * non-`any` typing for the Supabase keys so `import.meta.env` access is
 * checked at compile time. The anon key is public by design (RLS is the
 * security boundary); never declare a VITE_-prefixed service role key here.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}