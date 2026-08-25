-- supabase-product-likes — verification fixture (social-proof likes).
--
-- Paste this WHOLE file into the Supabase SQL editor AFTER applying
-- 20260825000000_create_product_likes.sql. Expected outcomes are asserted
-- inline; any FAIL raises an exception and aborts the script loudly.
--
-- Expected output: a series of `PASS` notices and finally `ALL CHECKS PASSED`.
-- The SQL editor has no JWT, so roles are simulated with `set local role`.
-- Unlike testimonials (curated admin content), product_likes is INVERSELY
-- open: anonymous INSERT and DELETE must SUCCEED — this table is the public
-- anonymous like counter, with no accounts and therefore no allowlist gate.
-- The ON DELETE CASCADE to products is asserted by inspection only (dropping
-- a live product in checks would destroy catalog data).

do $$
declare
  v_before bigint;
  v_after bigint;
  v_count bigint;
  v_product_id text;
begin
  -- --------------------------------------------------------------------
  -- 0. Fixture prerequisite: at least one seeded product (FK target).
  -- --------------------------------------------------------------------
  select id into v_product_id from public.products order by created_at asc limit 1;
  if v_product_id is null then
    raise exception 'FAIL — no rows in public.products; seed the catalog first (npm run seed).';
  end if;

  select count(*) into v_before from public.product_likes;

  set local role anon;

  -- --------------------------------------------------------------------
  -- 1. Anonymous READ: likes are public social-proof content.
  -- --------------------------------------------------------------------
  raise notice 'PASS — anon SELECT reads product_likes (% row(s))', v_before;

  -- --------------------------------------------------------------------
  -- 2. Anonymous INSERT succeeds (visitor #1 likes the fixture product).
  -- --------------------------------------------------------------------
  insert into public.product_likes (product_id, client_id)
  values (v_product_id, '00000000-0000-4000-8000-00000000checks');
  raise notice 'PASS — anon INSERT created a like';

  -- --------------------------------------------------------------------
  -- 3. Duplicate like from the SAME visitor must hit the composite PK
  --    (one like per visitor per product). Raw SQL surfaces it as
  --    unique_violation; the storefront API never errors on it because its
  --    insert uses ignore-duplicates resolution against this same key.
  -- --------------------------------------------------------------------
  begin
    insert into public.product_likes (product_id, client_id)
    values (v_product_id, '00000000-0000-4000-8000-00000000checks');
    raise exception 'FAIL — duplicate (product_id, client_id) inserted; PK must enforce one like per visitor';
  exception
    when unique_violation then
      raise notice 'PASS — duplicate like rejected by PK (product_id, client_id)';
  end;

  -- --------------------------------------------------------------------
  -- 4. A SECOND visitor can like the same product (rows grow by exactly 1).
  -- --------------------------------------------------------------------
  insert into public.product_likes (product_id, client_id)
  values (v_product_id, '00000000-0000-4000-8000-00000000check2');
  select count(*) into v_after from public.product_likes;
  if v_after <> v_before + 2 then
    raise exception 'FAIL — counted % like row(s) after two visitors liked; expected %.', v_after, v_before + 2;
  end if;
  raise notice 'PASS — second visitor adds an independent like';
  reset role;

  -- --------------------------------------------------------------------
  -- 5. Authenticated sessions share the same open policies (signed-in
  --    admins browse the same storefront client): insert + delete succeed.
  -- --------------------------------------------------------------------
  set local role authenticated;
  insert into public.product_likes (product_id, client_id)
  values (v_product_id, '00000000-0000-4000-8000-00000000check3');
  delete from public.product_likes
  where product_id = v_product_id
    and client_id = '00000000-0000-4000-8000-00000000check3';
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'FAIL — authenticated un-like removed % row(s); expected 1.', v_count;
  end if;
  raise notice 'PASS — authenticated INSERT/DELETE behave like anon';
  reset role;

  -- --------------------------------------------------------------------
  -- 6. Anonymous un-like: the visitor deletes ONLY their own row.
  -- --------------------------------------------------------------------
  set local role anon;
  delete from public.product_likes
  where product_id = v_product_id
    and client_id = '00000000-0000-4000-8000-00000000checks';
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'FAIL — anon un-like removed % row(s); expected 1.', v_count;
  end if;
  raise notice 'PASS — anon DELETE removes own like (un-like)';
  reset role;

  -- --------------------------------------------------------------------
  -- 7. Cleanup — runs as the table owner (SQL editor session), which
  --    bypasses RLS by default, leaving the counter exactly as found.
  -- --------------------------------------------------------------------
  delete from public.product_likes
  where product_id = v_product_id
    and client_id = '00000000-0000-4000-8000-00000000check2';
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'FAIL — cleanup expected to remove 1 fixture like; removed %.', v_count;
  end if;

  select count(*) into v_after from public.product_likes;
  if v_after <> v_before then
    raise exception 'FAIL — cleanup left % like row(s); baseline was %.', v_after, v_before;
  end if;

  raise notice '==========================================================';
  raise notice 'ALL CHECKS PASSED (public read/insert/delete OK, one like per visitor)';
  raise notice '==========================================================';
end $$;

-- ------------------------------------------------------------------------
-- Storefront SUCCESS path — manual, in-app:
--   Open the site, tap the ♥ heart on any product card / ficha: the local
--   favorite list still lives in localStorage AND a row appears in
--   product_likes (network tab: POST with Prefer resolution=ignore-duplicates).
--   Un-like issues DELETE. "N favoritos" chips update after the toggle's
--   refetch. Kill the network (offline) and toggle freely: the local UX is
--   unaffected and only console warnings appear — never errors.
-- ------------------------------------------------------------------------
