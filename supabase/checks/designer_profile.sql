-- supabase-designer-profile — verification fixture (slice 1 of
-- designer-profile-supabase).
--
-- Paste this WHOLE file into the Supabase SQL editor AFTER applying
-- 20260824040000_create_designer_profile.sql. Expected outcomes are asserted
-- inline; any FAIL raises an exception and aborts the script loudly.
--
-- Expected output: a series of `PASS` notices and finally `ALL CHECKS PASSED`.
-- The SQL editor has no JWT, so public.is_admin() is false here even for the
-- owner — the allowlisted UPDATE success path is verified manually in the
-- browser (commented section at the bottom), same as testimonials.sql /
-- contact_channels.sql.
--
-- Unlike testimonials.sql no fixture INSERT is needed: the migration seeds
-- the singleton itself, and there are deliberately NO insert/delete policies
-- to exercise success paths for — every non-admin write must fail.

do $$
declare
  v_count bigint;
begin
  -- --------------------------------------------------------------------
  -- 0. Seeded singleton: exactly one row and it is id = 1. Proves presence
  --    AND exactly-one, so later 0-row results cannot be vacuous passes.
  -- --------------------------------------------------------------------
  select count(*) into v_count from public.designer_profile;
  if v_count <> 1 then
    raise exception 'FAIL — table holds % row(s); the singleton must hold exactly one.', v_count;
  end if;
  select count(*) into v_count from public.designer_profile where id = 1;
  if v_count <> 1 then
    raise exception 'FAIL — singleton row does not have id = 1.';
  end if;
  raise notice 'PASS — seeded singleton exists (exactly one row, id=1)';

  set local role anon;

  -- --------------------------------------------------------------------
  -- 1. Anonymous READ succeeds: the profile is public storefront content.
  -- --------------------------------------------------------------------
  select count(*) into v_count from public.designer_profile where id = 1;
  if v_count <> 1 then
    raise exception 'FAIL — anon SELECT could not read the singleton.';
  end if;
  raise notice 'PASS — anon SELECT reads the profile';

  -- --------------------------------------------------------------------
  -- 2. Anonymous UPDATE must be denied: with RLS enabled and NO anon update
  --    policy, Postgres does NOT raise — it silently filters the row, so
  --    the UPDATE affects 0 rows (same mechanics as step 4). Any row
  --    touched means the policy surface regressed -> explicit FAIL.
  -- --------------------------------------------------------------------
  update public.designer_profile set claim = 'deny probe' where id = 1;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — anon UPDATE touched % row(s); updates must be allowlist-only', v_count;
  end if;
  raise notice 'PASS — anon UPDATE affected 0 rows (RLS)';

  -- --------------------------------------------------------------------
  -- 3. Anonymous INSERT must FAIL. There is NO insert policy, so the RLS
  --    denial (insufficient_privilege) is the expected rejection;
  --    check_violation / unique_violation are caught as belt-and-braces
  --    across planner orderings (CHECK id=1 / PK reject a second row
  --    structurally regardless). Any success means the policy surface
  --    regressed -> explicit FAIL.
  -- --------------------------------------------------------------------
  begin
    insert into public.designer_profile
      (id, name, role, bio, collection_name, collection_story, claim)
    values
      (2, 'Anon', 'probe', 'probe', 'probe', 'Anonymous inserts must be rejected.', 'probe');
    raise exception 'FAIL — anon INSERT succeeded; the singleton admits no second row';
  exception
    when insufficient_privilege then
      raise notice 'PASS — anon INSERT rejected (RLS)';
    when check_violation then
      raise notice 'PASS — anon INSERT rejected (CHECK id=1)';
    when unique_violation then
      raise notice 'PASS — anon INSERT rejected (PK)';
  end;

  reset role;

  -- --------------------------------------------------------------------
  -- 4. Non-allowlist authenticated UPDATE -> 0 rows (RLS). This session has
  --    no JWT, so public.is_admin() evaluates false. Step 0 already proved
  --    the row exists and is readable, so a 0-row result here is
  --    meaningful, not vacuous.
  -- --------------------------------------------------------------------
  set local role authenticated;
  update public.designer_profile set claim = 'deny probe' where id = 1;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — non-allowlist authenticated UPDATE touched % row(s).', v_count;
  end if;
  raise notice 'PASS — non-allowlist authenticated UPDATE affected 0 rows (RLS)';
  reset role;

  raise notice '==================================================';
  raise notice 'ALL CHECKS PASSED (public reads OK, singleton lifecycle migration-only)';
  raise notice '==================================================';
end $$;

-- ------------------------------------------------------------------------
-- Allowlisted-session SUCCESS path — manual, in-app (SQL editor has no JWT):
--   Once Phase 4 ships, sign in at #/admin with the allowlisted account and
--   open #/admin/disenadora: edit any field, save, confirm it persists,
--   updated_at advances, and the storefront section reflects the change in
--   realtime without a reload. Every mutation goes through the same anon
--   client and RLS policies checked above, gated on public.is_admin().
--   Any OTHER account gets 0 rows / an RLS denial in the network tab.
-- ------------------------------------------------------------------------
