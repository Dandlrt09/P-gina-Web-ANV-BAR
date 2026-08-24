-- supabase-product-reviews — verification fixture (slice 1 of reviews-supabase).
--
-- Paste this WHOLE file into the Supabase SQL editor AFTER applying
-- 20260824000000_create_product_reviews.sql. Expected outcomes are asserted
-- inline; any FAIL raises an exception and aborts the script loudly.
--
-- Expected output: a series of `PASS` notices and finally `ALL CHECKS PASSED`.
-- The SQL editor has no JWT, so public.is_admin() is false here even for the
-- owner — the allowlisted UPDATE/DELETE success path is verified manually in
-- the browser (commented section at the bottom), same as contact_channels.sql.

do $$
declare
  v_before bigint;
  v_after bigint;
  v_count bigint;
  v_product_id text;
  v_review_id uuid;
begin
  -- --------------------------------------------------------------------
  -- 0. Fixture prerequisite: at least one seeded product (FK target).
  -- --------------------------------------------------------------------
  select id into v_product_id from public.products order by created_at asc limit 1;
  if v_product_id is null then
    raise exception 'FAIL — no rows in public.products; seed the catalog first (npm run seed).';
  end if;

  set local role anon;

  -- --------------------------------------------------------------------
  -- 1. Anonymous READ: baseline count before the fixture insert.
  -- --------------------------------------------------------------------
  select count(*) into v_before from public.product_reviews;
  raise notice 'PASS — anon SELECT reads product_reviews (% row(s))', v_before;

  -- --------------------------------------------------------------------
  -- 2. Anonymous INSERT succeeds (CHECK-bounded: rating 1-5,
  --    comment 10-1000 chars; author nullable).
  -- --------------------------------------------------------------------
  insert into public.product_reviews (product_id, rating, comment, author)
  values (
    v_product_id,
    5,
    'Fixture review written by checks SQL — removed at the end.',
    null
  )
  returning id into v_review_id;
  if v_review_id is null then
    raise exception 'FAIL — anon INSERT returned no id; RLS must allow anonymous inserts.';
  end if;
  raise notice 'PASS — anon INSERT created fixture review %', v_review_id;

  -- --------------------------------------------------------------------
  -- 3. Anonymous READ sees the inserted row (count grew by exactly 1).
  -- --------------------------------------------------------------------
  select count(*) into v_after from public.product_reviews;
  if v_after <> v_before + 1 then
    raise exception 'FAIL — anon SELECT counted % row(s) after inserting one; expected %.', v_after, v_before + 1;
  end if;
  raise notice 'PASS — anon SELECT sees the inserted review';
  reset role;

  -- --------------------------------------------------------------------
  -- 4. Mutations denied WITHOUT allowlist -> 0 rows (RLS). Both roles run
  --    WITHOUT a JWT inside the SQL editor, so public.is_admin() is false
  --    for both.
  -- --------------------------------------------------------------------
  set local role anon;
  update public.product_reviews set admin_response = 'deny check' where id = v_review_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — anon UPDATE touched % row(s); responses must be allowlist-only.', v_count;
  end if;
  delete from public.product_reviews where id = v_review_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — anon DELETE removed % row(s); deletes must be allowlist-only.', v_count;
  end if;
  raise notice 'PASS — anon UPDATE/DELETE affected 0 rows (RLS)';
  reset role;

  set local role authenticated;
  update public.product_reviews set admin_response = 'deny check' where id = v_review_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — non-allowlist authenticated UPDATE touched % row(s).', v_count;
  end if;
  delete from public.product_reviews where id = v_review_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — non-allowlist authenticated DELETE removed % row(s).', v_count;
  end if;
  raise notice 'PASS — non-allowlist authenticated UPDATE/DELETE affected 0 rows (RLS)';
  reset role;

  -- --------------------------------------------------------------------
  -- 5. Cleanup — runs as the table owner (SQL editor session), which
  --    bypasses RLS by default, leaving no junk rows behind.
  -- --------------------------------------------------------------------
  delete from public.product_reviews where id = v_review_id;
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'FAIL — cleanup expected to remove fixture review %; removed %.', v_review_id, v_count;
  end if;

  raise notice '==================================================';
  raise notice 'ALL CHECKS PASSED (anon reads+insert OK, mutations allowlist-only)';
  raise notice '==================================================';
end $$;

-- ------------------------------------------------------------------------
-- Allowlisted-session SUCCESS path — manual, in-app (SQL editor has no JWT):
--   Once Phase 4 ships, sign in at #/admin with the allowlisted account and
--   open #/admin/comentarios: save a response on a review and/or delete one,
--   confirm it persists and appears/drops on the storefront in realtime.
--   Every mutation goes through the same anon client and RLS policies checked
--   above, gated on public.is_admin(). Any OTHER account gets 0 rows / an
--   RLS denial in the network tab.
-- ------------------------------------------------------------------------
