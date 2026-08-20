-- supabase-admin — MVP admin allowlist + product write policies.
-- Apply via Supabase SQL editor (or `supabase db push` once linked).
-- Additive + idempotent: safe to re-run.
--
-- Scope: slices A+B of the admin MVP. Adds:
--   - public.is_admin(): the ONLY allowlist (hardcoded admin email constant).
--   - updated_at column on tables missing it + shared bump trigger on both.
--   - write policy trio (insert/update/delete) on products AND categories,
--     each gated on is_admin() — NEVER blanket `to authenticated`.
--   - storage.objects policies for the existing public bucket `productos`
--     (insert/update/delete allowlist). The anon public-read policy from the
--     base migration is intentionally untouched.
--
-- RLS is the security boundary: the anon key ships in the bundle on purpose.
-- Every write below is denied to anon and to non-allowlist authenticated
-- sessions (0 rows / RLS rejection).

-- ------------------------------------------------------------------------
-- Admin allowlist
-- ------------------------------------------------------------------------

-- SOLE admin email. If you change the allowlist, keep it in sync across
-- public.is_admin() (here), src/lib/auth.ts (ADMIN_EMAILS) and the
-- deny-checks fixture (supabase/checks/admin-allowlist-denies.sql).
-- `security definer` + `set search_path = public` avoids search-path attacks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and auth.email() = 'danieldelosriost@gmail.com';
$$;

-- ------------------------------------------------------------------------
-- updated_at (additive only: products already carries the column)
-- ------------------------------------------------------------------------

alter table public.categories add column if not exists updated_at timestamptz not null default now();
alter table public.products  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_products on public.products;
create trigger set_updated_at_on_products
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_categories on public.categories;
create trigger set_updated_at_on_categories
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------
-- Write policies — products & categories (no blanket write access)
-- ------------------------------------------------------------------------
-- Every write is gated on public.is_admin() (email allowlist). The base
-- anon-read policies are untouched; this only grants writes to the
-- allowlisted authenticated user.

drop policy if exists "admin insert products" on public.products;
create policy "admin insert products" on public.products
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admin update products" on public.products;
create policy "admin update products" on public.products
  for update to authenticated
  using (public.is_admin());

drop policy if exists "admin delete products" on public.products;
create policy "admin delete products" on public.products
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "admin insert categories" on public.categories;
create policy "admin insert categories" on public.categories
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admin update categories" on public.categories;
create policy "admin update categories" on public.categories
  for update to authenticated
  using (public.is_admin());

drop policy if exists "admin delete categories" on public.categories;
create policy "admin delete categories" on public.categories
  for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------
-- Read policies for authenticated — admin list queries
-- ------------------------------------------------------------------------
-- The base migration granted reads ONLY `to anon`; a signed-in session runs
-- as `authenticated` and would otherwise get an empty catalog in the admin
-- list (RLS denies, 0 rows, no error). Products/categories are public
-- content (anon already reads them), so any signed-in session reading them
-- is harmless — this only adds the missing read path for admin screens.

drop policy if exists "authenticated read products" on public.products;
create policy "authenticated read products" on public.products
  for select to authenticated using (true);

drop policy if exists "authenticated read categories" on public.categories;
create policy "authenticated read categories" on public.categories
  for select to authenticated using (true);

-- ------------------------------------------------------------------------
-- Storage — bucket `productos` write allowlist
-- ------------------------------------------------------------------------
-- The `public read productos` policy from the base migration remains the
-- only read policy; these three add the allowlisted write paths the admin
-- needs for the product color uploads.

drop policy if exists "admin insert productos" on storage.objects;
create policy "admin insert productos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin update productos" on storage.objects;
create policy "admin update productos" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin delete productos" on storage.objects;
create policy "admin delete productos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and public.is_admin());