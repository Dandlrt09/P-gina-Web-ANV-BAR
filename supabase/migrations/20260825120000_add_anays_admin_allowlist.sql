-- supabase-admin — add Anays to the admin allowlist.
--
-- Adds anaysvalentinav@gmail.com alongside the existing owner email in
-- public.is_admin(). Keep in sync across:
--   - public.is_admin() (this migration, the live authority)
--   - src/admin/auth.ts (ADMIN_EMAILS — UI gate only, not a security boundary)
--   - supabase/checks/admin-allowlist-denies.sql (non-allowlist deny fixture;
--     unaffected: it asserts denial for sessions with no allowlisted email)
--
-- `security definer` + `set search_path = public` avoids search-path attacks
-- (same hardening as the original definition in 20260820000000).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and auth.email() in ('danieldelosriost@gmail.com', 'anaysvalentinav@gmail.com');
$$;
