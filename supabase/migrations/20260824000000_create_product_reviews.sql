-- supabase-product-reviews — customer product reviews with realtime (slice 1
-- of reviews-supabase). Apply via Supabase SQL editor (or `supabase db push`
-- once linked).
-- Additive + idempotent: safe to re-run (policy drops + guarded publication).
--
-- Scope: adds public.product_reviews, the Supabase replacement for device-
-- scoped localStorage reviews (rating/comment/author + moderation response):
--   - RLS enabled; public reads for anon AND authenticated.
--   - Anonymous inserts allowed (with check true); spam bounded by the CHECKs.
--   - UPDATE/DELETE gated on public.is_admin() — NEVER blanket
--     `to authenticated` (exact pattern from
--     20260821000000_create_contact_channels.sql).
--   - Table added to the supabase_realtime publication inside a DO block
--     guarding pg_publication_tables (ALTER PUBLICATION ADD TABLE is not
--     idempotent).
--
-- RLS is the security boundary: the anon key ships in the bundle on purpose.

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 10 and 1000),
  author text check (char_length(author) <= 60),
  admin_response text check (char_length(admin_response) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.product_reviews enable row level security;

-- ------------------------------------------------------------------------
-- Read policies — reviews are public storefront content: any session may
-- read them (anon serves the product page, authenticated serves the future
-- admin list). Same pair as contact_channels. Public can read reviews.
-- ------------------------------------------------------------------------

drop policy if exists "anon read product reviews" on public.product_reviews;
create policy "anon read product reviews" on public.product_reviews
  for select to anon using (true);

drop policy if exists "authenticated read product reviews" on public.product_reviews;
create policy "authenticated read product reviews" on public.product_reviews
  for select to authenticated using (true);

-- ------------------------------------------------------------------------
-- Insert — anonymous visitors submit reviews through the review wizard;
-- rating/comment/author bounds live in the table CHECKs above.
-- ------------------------------------------------------------------------

drop policy if exists "anon insert product reviews" on public.product_reviews;
create policy "anon insert product reviews"
  on public.product_reviews for insert to anon with check (true);

-- ------------------------------------------------------------------------
-- Moderation policies — allowlist only, same trio as products/categories.
-- Every write beyond anonymous insert is gated on public.is_admin(); anon
-- and non-allowlist authenticated sessions get the default deny (0 rows /
-- RLS rejection). No updated_at trigger: ordering contract is created_at.
-- ------------------------------------------------------------------------

drop policy if exists "admin update product reviews" on public.product_reviews;
create policy "admin update product reviews"
  on public.product_reviews for update to authenticated
  using (public.is_admin());

drop policy if exists "admin delete product reviews" on public.product_reviews;
create policy "admin delete product reviews"
  on public.product_reviews for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------
-- Listing index — per-product review list ordered newest first.
-- ------------------------------------------------------------------------

create index if not exists product_reviews_product_id_idx
  on public.product_reviews (product_id, created_at desc);

-- ------------------------------------------------------------------------
-- Realtime — deliver INSERT/UPDATE/DELETE events to subscribed clients so
-- the storefront reflects new/moderated reviews without a reload.
-- ------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_reviews'
  ) then
    alter publication supabase_realtime add table public.product_reviews;
  end if;
end $$;
