-- supabase-testimonials — verification fixture (slice 1 of testimonials-supabase).
--
-- Paste this WHOLE file into the Supabase SQL editor AFTER applying
-- 20260824030000_create_testimonials.sql. Expected outcomes are asserted
-- inline; any FAIL raises an exception and aborts the script loudly.
--
-- Expected output: a series of `PASS` notices and finally `ALL CHECKS PASSED`.
-- The SQL editor has no JWT, so public.is_admin() is false here even for the
-- owner — the allowlisted INSERT/UPDATE/DELETE success path is verified
-- manually in the browser (commented section at the bottom), same as
-- contact_channels.sql.
-- Unlike product_reviews.sql, the anonymous INSERT here is ASSERTED TO FAIL:
-- testimonials are curated admin content with no public submission UI, so no
-- anon write policy exists and RLS must reject the row.

do $$
declare
  v_before bigint;
  v_visible bigint;
  v_count bigint;
  v_testimonial_id uuid;
begin
  -- --------------------------------------------------------------------
  -- 0. Fixture — this owner session bypasses RLS, so it seeds the row the
  --    deny checks below will probe. Values stay inside the CHECK bounds
  --    so a rejection below can only come from RLS, never from a CHECK.
  -- --------------------------------------------------------------------
  insert into public.testimonials (name, text)
  values (
    'Fixture',
    'Fixture testimonial written by checks SQL — removed at the end.'
  )
  returning id into v_testimonial_id;

  set local role anon;

  -- --------------------------------------------------------------------
  -- 1. Anonymous READ: testimonials are public storefront content.
  -- --------------------------------------------------------------------
  select count(*) into v_before from public.testimonials;
  raise notice 'PASS — anon SELECT reads testimonials (% row(s))', v_before;

  -- --------------------------------------------------------------------
  -- 2. Anonymous INSERT must FAIL (inverse assertion vs product_reviews):
  --    with no anon insert policy, RLS rejects the row with
  --    insufficient_privilege. Only that denial counts as PASS; if the
  --    insert somehow goes through, the explicit FAIL aborts the script.
  -- --------------------------------------------------------------------
  begin
    insert into public.testimonials (name, text)
    values ('Anon', 'Anonymous inserts must be rejected — allowlist-only writes.');
    raise exception 'FAIL — anon INSERT succeeded; inserts must be allowlist-only';
  exception
    when insufficient_privilege then
      raise notice 'PASS — anon INSERT rejected (RLS)';
  end;

  -- --------------------------------------------------------------------
  -- 3. Non-allowlist authenticated mutations -> 0 rows (RLS). This session
  --    has no JWT, so public.is_admin() is false. First confirm the fixture
  --    row is actually readable, otherwise a 0-row result would prove
  --    nothing (vacuous pass).
  -- --------------------------------------------------------------------
  select count(*) into v_visible
  from public.testimonials where id = v_testimonial_id;
  if v_visible <> 1 then
    raise exception 'FAIL — fixture testimonial % not readable; deny checks would be vacuous.', v_testimonial_id;
  end if;
  reset role;

  set local role authenticated;
  update public.testimonials set name = 'deny check' where id = v_testimonial_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — non-allowlist authenticated UPDATE touched % row(s).', v_count;
  end if;
  delete from public.testimonials where id = v_testimonial_id;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — non-allowlist authenticated DELETE removed % row(s).', v_count;
  end if;
  raise notice 'PASS — non-allowlist authenticated UPDATE/DELETE affected 0 rows (RLS)';
  reset role;

  -- --------------------------------------------------------------------
  -- 4. Cleanup — runs as the table owner (SQL editor session), which
  --    bypasses RLS by default, leaving no junk rows behind.
  -- --------------------------------------------------------------------
  delete from public.testimonials where id = v_testimonial_id;
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'FAIL — cleanup expected to remove fixture testimonial %; removed %.', v_testimonial_id, v_count;
  end if;

  raise notice '==================================================';
  raise notice 'ALL CHECKS PASSED (public reads OK, writes allowlist-only)';
  raise notice '==================================================';
end $$;

-- ------------------------------------------------------------------------
-- Allowlisted-session SUCCESS path — manual, in-app (SQL editor has no JWT):
--   Once Phase 3 ships, sign in at #/admin with the allowlisted account and
--   open #/admin/testimonios: create, edit and delete a testimonial, confirm
--   it persists and appears/drops on the storefront in realtime, and check
--   updated_at refreshes after an edit. Every mutation goes through the same
--   anon client and RLS policies checked above, gated on public.is_admin().
--   Any OTHER account gets 0 rows / an RLS denial in the network tab.
-- ------------------------------------------------------------------------
