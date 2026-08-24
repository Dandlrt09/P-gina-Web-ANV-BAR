-- supabase-product-reviews — follow-up to 20260824000000_create_product_reviews.sql.
-- The storefront shares ONE Supabase client across public site and admin panel,
-- so an admin signed in at #/admin submits storefront reviews with an
-- `authenticated` JWT. The original INSERT policy covered `anon` only, which
-- let anonymous visitors publish but rejected the signed-in owner with an RLS
-- violation. Reviews are public content: allow INSERT for both roles, still
-- bounded by the table CHECKs. Moderation (UPDATE/DELETE) remains gated on
-- public.is_admin().
-- Additive + idempotent: safe to re-run.

drop policy if exists "anon insert product reviews" on public.product_reviews;
create policy "public insert product reviews"
  on public.product_reviews for insert
  to anon, authenticated
  with check (true);
