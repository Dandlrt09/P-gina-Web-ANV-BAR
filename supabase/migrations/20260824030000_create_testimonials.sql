-- supabase-testimonials — storefront testimonials with realtime (slice 1 of
-- testimonials-supabase). Apply via Supabase SQL editor (or `supabase db push`
-- once linked).
-- Additive + idempotent: safe to re-run (policy drops + guarded publication).
--
-- Scope: adds public.testimonials, the Supabase replacement for the build-time
-- content/testimonials.json quotes (curated name/text pairs shown on the
-- landing page):
--   - RLS enabled; public reads for anon AND authenticated.
--   - NO anonymous write policy: testimonials are curated admin content, not
--     public submissions. Every write is gated on public.is_admin()
--     (exact contact_channels trio pattern, NEVER blanket
--     `to authenticated`); anon and non-allowlist authenticated sessions get
--     the default deny (0 rows / RLS rejection).
--   - REPLICA IDENTITY FULL from day one (lesson from
--     20260824020000_product_reviews_replica_identity_full.sql): realtime
--     DELETE payloads carry the whole old row, so refetch-on-event handlers
--     drop deleted testimonials instantly with no stale ghost entries.
--   - updated_at bump trigger reusing public.set_updated_at().
--   - Table added to the supabase_realtime publication inside a DO block
--     guarding pg_publication_tables (ALTER PUBLICATION ADD TABLE is not
--     idempotent).
--
-- RLS is the security boundary: the anon key ships in the bundle on purpose.

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

-- Day-one replica identity: avoids the follow-up migration product_reviews
-- needed once ghosts showed up in realtime subscribers.
alter table public.testimonials replica identity full;

-- ------------------------------------------------------------------------
-- Read policies — testimonials are public storefront content: any session may
-- read them (anon serves the landing page, authenticated serves the future
-- admin list). Same pair as contact_channels/product_reviews.
-- ------------------------------------------------------------------------

drop policy if exists "anon read testimonials" on public.testimonials;
create policy "anon read testimonials" on public.testimonials
  for select to anon using (true);

drop policy if exists "authenticated read testimonials" on public.testimonials;
create policy "authenticated read testimonials" on public.testimonials
  for select to authenticated using (true);

-- ------------------------------------------------------------------------
-- Write policies — allowlist ONLY, same trio as products/categories/
-- contact_channels. Every write is gated on public.is_admin(). Intentionally
-- NO anon write policy exists: there is no public submission UI, so open
-- inserts would be a spam vector.
-- ------------------------------------------------------------------------

drop policy if exists "admin insert testimonials" on public.testimonials;
create policy "admin insert testimonials" on public.testimonials
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admin update testimonials" on public.testimonials;
create policy "admin update testimonials" on public.testimonials
  for update to authenticated
  using (public.is_admin());

drop policy if exists "admin delete testimonials" on public.testimonials;
create policy "admin delete testimonials" on public.testimonials
  for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------
-- updated_at bump — reuses public.set_updated_at() from
-- 20260820000000_admin_products.sql (this migration applies after it).
-- ------------------------------------------------------------------------

drop trigger if exists set_updated_at_on_testimonials on public.testimonials;
create trigger set_updated_at_on_testimonials
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------
-- Listing index — storefront list ordered newest first.
-- ------------------------------------------------------------------------

create index if not exists testimonials_created_at_idx
  on public.testimonials (created_at desc);

-- ------------------------------------------------------------------------
-- Realtime — deliver INSERT/UPDATE/DELETE events to subscribed clients so
-- the storefront reflects admin changes without a reload. DELETE payloads
-- are complete thanks to REPLICA IDENTITY FULL above.
-- ------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'testimonials'
  ) then
    alter publication supabase_realtime add table public.testimonials;
  end if;
end $$;
