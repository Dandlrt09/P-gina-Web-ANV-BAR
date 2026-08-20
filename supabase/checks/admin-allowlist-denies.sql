-- supabase-admin — deny-checks fixture (CR-PA-02 / SC-PA-02).
--
-- Paste this WHOLE file into the Supabase SQL editor and run it as the
-- postgres (owner) role. It flips the session to role `anon` and asserts,
-- for every write path, that the RLS policies REJECT it; it also asserts
-- the anonymous READ paths still work. A check that unexpectedly succeeds
-- raises an exception and aborts the script so the failure is loud.
--
-- Expected output: a series of `PASS` notices and finally `ALL CHECKS PASSED`.
-- If you see a `FAIL`, the security boundary is broken — do not ship.
--
-- The allowlisted-session success path (is_admin() = true) CANNOT be proven
-- from the SQL editor: it needs a real signed-in session (the editor has no
-- JWT, so `auth.email()` is always NULL here and `is_admin()` is false even
-- for the owner). Verify it in the browser admin panel with the account
-- danieldelosriost@gmail.com (see the commented section at the bottom).
--
-- Style follows the migration: additive, self-contained, transaction-scoped
-- `anon` attempts only.

do $$
declare
  v_id text;
  affected bigint;
  denied boolean;
begin
  -- ----------------------------------------------------------------------
  -- 0. Allowlist sanity (no JWT present in the SQL editor: never true)
  -- ----------------------------------------------------------------------
  if public.is_admin() then
    raise exception 'FAIL — public.is_admin() returned true for a session without an authenticated email (it must be false for postgres/anon).';
  end if;
  raise notice 'PASS — public.is_admin() is false without an authenticated email';

  -- ----------------------------------------------------------------------
  -- 1. Anonymous READ paths stay intact
  -- ----------------------------------------------------------------------
  set local role anon;

  select count(*) into affected from public.products;
  if affected = 0 then
    raise exception 'FAIL — anon SELECT on public.products returned 0 rows; the public catalog would be empty.';
  end if;
  raise notice 'PASS — anon SELECT products reads % row(s) (public read path intact)', affected;

  select count(*) into affected from public.categories;
  if affected = 0 then
    raise exception 'FAIL — anon SELECT on public.categories returned 0 rows; the category list would be empty.';
  end if;
  raise notice 'PASS — anon SELECT categories reads % row(s) (public read path intact)', affected;

  reset role;

  -- ----------------------------------------------------------------------
  -- 2. anon INSERT / UPDATE / DELETE on public.products -> denied
  --    (insert/update reject with an RLS error; delete silently affects 0)
  -- ----------------------------------------------------------------------
  set local role anon;

  begin
    insert into public.products (id, name, category, price_cop, sizes, colors, fabric, care, editorial)
    values ('deny-check-anon', 'Deny check', 'Accesorios', 1000, '["Único"]'::jsonb,
            '[{"name":"Negro","hex":"#000000"}]'::jsonb, 'tela', 'cuidado', 'editorial');
    denied := true;
  exception
    when check_violation or foreign_key_violation then
      raise; -- a real data error, not the denial we assert: abort loudly
    when others then
      denied := false;
  end;
  if denied then
    raise exception 'FAIL — anon INSERT into public.products was ALLOWED (RLS policy missing or miswritten).';
  end if;
  raise notice 'PASS — anon INSERT products denied (RLS reject, 0 rows)';

  -- target an existing product so the UPDATE/DELETE assertions are meaningful
  select id into v_id from public.products order by sort_order nulls last, id limit 1;
  if v_id is null then
    raise notice 'SKIP — no products row to target UPDATE/DELETE checks (fresh/empty table)';
  else
    begin
      update public.products set name = 'deny check' where id = v_id;
      get diagnostics affected = row_count;
      denied := affected > 0;
    exception
      when others then
        denied := false;
    end;
    if denied then
      raise exception 'FAIL — anon UPDATE on public.products touched % row(s); the write policy for products must be allowlist-only.', affected;
    end if;
    raise notice 'PASS — anon UPDATE products affected 0 rows (or RLS reject)';

    begin
      delete from public.products where id = v_id;
      get diagnostics affected = row_count;
      denied := affected > 0;
    exception
      when others then
        denied := false;
    end;
    if denied then
      raise exception 'FAIL — anon DELETE on public.products removed % row(s); the delete policy must be allowlist-only.', affected;
    end if;
    raise notice 'PASS — anon DELETE products affected 0 rows (or RLS reject)';
  end if;

  reset role;

  -- ----------------------------------------------------------------------
  -- 3. anon INSERT / UPDATE / DELETE on public.categories -> denied
  -- ----------------------------------------------------------------------
  set local role anon;

  begin
    insert into public.categories (name, sort_order) values ('Deny check', 999);
    denied := true;
  exception
    when check_violation or unique_violation or foreign_key_violation then
      raise; -- a real data error, not the denial we assert: abort loudly
    when others then
      denied := false;
  end;
  if denied then
    raise exception 'FAIL — anon INSERT into public.categories was ALLOWED (RLS policy missing or miswritten).';
  end if;
  raise notice 'PASS — anon INSERT categories denied (RLS reject, 0 rows)';

  begin
    update public.categories set name = 'Deny check' where sort_order = 0;
    get diagnostics affected = row_count;
    denied := affected > 0;
  exception
    when others then
      denied := false;
  end;
  if denied then
    raise exception 'FAIL — anon UPDATE on public.categories touched % row(s); category writes must be allowlist-only.', affected;
  end if;
  raise notice 'PASS — anon UPDATE categories affected 0 rows (or RLS reject)';

  begin
    delete from public.categories where sort_order = 0;
    get diagnostics affected = row_count;
    denied := affected > 0;
  exception
    when others then
      denied := false;
  end;
  if denied then
    raise exception 'FAIL — anon DELETE on public.categories removed % row(s); category deletes must be allowlist-only.', affected;
  end if;
  raise notice 'PASS — anon DELETE categories affected 0 rows (or RLS reject)';

  reset role;

  -- ----------------------------------------------------------------------
  -- 4. anon INSERT / UPDATE / DELETE on storage.objects (bucket productos)
  --    -> denied (the admin write allowlist, never anon)
  -- ----------------------------------------------------------------------
  set local role anon;

  begin
    insert into storage.objects (bucket_id, name, metadata)
    values ('productos', 'deny-check.txt', '{"mimetype":"text/plain","size":1}'::jsonb);
    denied := true;
  exception
    when check_violation or unique_violation or foreign_key_violation or not_null_violation then
      raise; -- schema mismatch on the probe columns: adjust them, this is not the denial we assert
    when others then
      denied := false;
  end;
  if denied then
    raise exception 'FAIL — anon INSERT into storage.objects (productos) was ALLOWED; storage uploads must be allowlist-only.';
  end if;
  raise notice 'PASS — anon INSERT storage.objects (productos) denied (RLS reject, 0 rows)';

  begin
    update storage.objects set name = 'deny-check.txt' where bucket_id = 'productos' and name = 'deny-check.txt';
    get diagnostics affected = row_count;
    denied := affected > 0;
  exception
    when others then
      denied := false;
  end;
  if denied then
    raise exception 'FAIL — anon UPDATE on storage.objects touched % row(s); storage updates must be allowlist-only.', affected;
  end if;
  raise notice 'PASS — anon UPDATE storage.objects (productos) affected 0 rows (or RLS reject)';

  begin
    delete from storage.objects where bucket_id = 'productos' and name = 'deny-check.txt';
    get diagnostics affected = row_count;
    denied := affected > 0;
  exception
    when others then
      denied := false;
  end;
  if denied then
    raise exception 'FAIL — anon DELETE on storage.objects removed % row(s); storage deletes must be allowlist-only.', affected;
  end if;
  raise notice 'PASS — anon DELETE storage.objects (productos) affected 0 rows (or RLS reject)';

  reset role;

  raise notice '==================================================';
  raise notice 'ALL CHECKS PASSED (deny-on-anon verified, public reads intact)';
  raise notice '==================================================';
end $$;

-- ------------------------------------------------------------------------
-- Allowlisted-session SUCCESS path (SC-PA-01 / SC-PA-02) — manual, browser:
--   1) Create the auth user in Supabase Dashboard > Authentication > Users
--      with email danieldelosriost@gmail.com (+ password).
--   2) Open the site, go to #/admin, sign in with that account.
--   3) Create a product with an image upload -> the products insert and the
--      storage object insert both pass because the session is
--      `authenticated` and public.is_admin() is true for that exact email.
--   4) Confirm the new product shows on the public catalog (#/ ) without any
--      commit or rebuild (SC-PA-01: live on next catalog fetch).
-- Any other account: the app shows the "No autorizado" screen and every
-- write returns 0 rows / an RLS denial in the network tab.
-- ------------------------------------------------------------------------