-- supabase-product-likes — anonymous aggregate like counting (social proof).
-- Apply via Supabase SQL editor (or `supabase db push` once linked).
-- Additive + idempotent: safe to re-run (policy drops).
--
-- Scope: adds public.product_likes, the anonymous mirror of the visitors'
-- localStorage favorites (the personal list itself NEVER moves server-side):
--   - product_id TEXT references public.products(id): products.id is a text
--     slug (20260819000000_products_categories.sql), NOT a uuid.
--   - client_id text: anonymous UUID generated once in the visitor's
--     localStorage (src/favorites/likes-api.ts). Not PII — public read is fine.
--   - PRIMARY KEY (product_id, client_id): exactly one like per visitor per
--     product. Client inserts use ignore-duplicates resolution against this
--     key, so re-likes never error and never double-count.
--   - RLS with PUBLIC read/insert/delete for anon AND authenticated: this
--     table IS the anonymous counter — visitors have no accounts, so there is
--     deliberately NO is_admin() allowlist here (inverse of testimonials).
--     Trust model: client_id is bearer-style; anyone can like/unlike under
--     any client_id. Worst case is vanity-number vandalism, acceptable for a
--     social-proof counter.
--   - ON DELETE CASCADE: removing a product removes its likes.
--   - NO updated_at trigger (rows are immutable) and NO realtime publication
--     in v1 — counts refetch once per page load and on every like-toggle.
--
-- RLS is the security boundary: the anon key ships in the bundle on purpose.

create table public.product_likes (
  product_id text not null references public.products(id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (product_id, client_id)
);

alter table public.product_likes enable row level security;

-- ------------------------------------------------------------------------
-- Read policies — aggregate counts are public storefront content (shown on
-- cards/detail as "N favoritos"). Same read pair as products/categories.
-- ------------------------------------------------------------------------

drop policy if exists "anon read product_likes" on public.product_likes;
create policy "anon read product_likes" on public.product_likes
  for select to anon using (true);

drop policy if exists "authenticated read product_likes" on public.product_likes;
create policy "authenticated read product_likes" on public.product_likes
  for select to authenticated using (true);

-- ------------------------------------------------------------------------
-- Write policies — INTENTIONALLY open to anon AND authenticated: visitors
-- have no accounts and must be able to like/unlike directly. Idempotency
-- comes from the composite PK plus the client's ignore-duplicates insert.
-- ------------------------------------------------------------------------

drop policy if exists "anon insert product_likes" on public.product_likes;
create policy "anon insert product_likes" on public.product_likes
  for insert to anon
  with check (true);

drop policy if exists "authenticated insert product_likes" on public.product_likes;
create policy "authenticated insert product_likes" on public.product_likes
  for insert to authenticated
  with check (true);

drop policy if exists "anon delete product_likes" on public.product_likes;
create policy "anon delete product_likes" on public.product_likes
  for delete to anon
  using (true);

drop policy if exists "authenticated delete product_likes" on public.product_likes;
create policy "authenticated delete product_likes" on public.product_likes
  for delete to authenticated
  using (true);

-- ------------------------------------------------------------------------
-- Un-like lookup index — the PK already serves per-product reads (counts);
-- this covers the per-client equality probe used by DELETE (un-like).
-- ------------------------------------------------------------------------

create index if not exists product_likes_client_id_idx
  on public.product_likes (client_id);
