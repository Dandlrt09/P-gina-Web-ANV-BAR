-- supabase-contact-channels — verification fixture (slice A).
--
-- Paste this WHOLE file into the Supabase SQL editor AFTER applying
-- 20260821000000_create_contact_channels.sql. Expected outcomes are asserted
-- inline; any FAIL raises an exception and aborts the script loudly.
--
-- Expected output: a series of `PASS` notices and finally `ALL CHECKS PASSED`.
-- The SQL editor has no JWT, so public.is_admin() is false here even for the
-- owner — the allowlisted UPDATE success path is verified manually in the
-- browser (commented section at the bottom), same as admin-allowlist-denies.sql.

do $$
declare
  v_count bigint;
  v_labels text[];
begin
  -- --------------------------------------------------------------------
  -- 1. Anonymous READ: exactly the 4 seeded rows, ordered by sort_order ASC
  -- --------------------------------------------------------------------
  set local role anon;

  select count(*) into v_count from public.contact_channels;
  if v_count <> 4 then
    raise exception 'FAIL — anon SELECT returned % row(s); expected the 4 seeded contact channels.', v_count;
  end if;
  raise notice 'PASS — anon SELECT reads the 4 seeded contact channels';

  -- NOTE: the 4th channel was originally seeded as 'Diseñadora' and is now the
  -- designer's PERSONAL Instagram, relabelled through #/admin/contacto — hence
  -- two 'Instagram' entries. Run this fixture AFTER that relabel.
  select array_agg(label order by sort_order asc) into v_labels from public.contact_channels;
  if v_labels is distinct from array['WhatsApp', 'Instagram', 'Facebook Marketplace', 'Instagram'] then
    raise exception 'FAIL — ordering query returned %; expected WhatsApp, Instagram, Facebook Marketplace, Instagram.', v_labels;
  end if;
  raise notice 'PASS — ORDER BY sort_order ASC yields WhatsApp, Instagram, Facebook Marketplace, Instagram';

  reset role;

  -- --------------------------------------------------------------------
  -- 2. Non-allowlist writes -> 0 rows (RLS). Both roles run WITHOUT a JWT
  --    inside the SQL editor, so public.is_admin() is false for both.
  -- --------------------------------------------------------------------
  set local role anon;
  update public.contact_channels set label = 'deny check' where label = 'WhatsApp';
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — anon UPDATE touched % row(s); channel writes must be allowlist-only.', v_count;
  end if;
  raise notice 'PASS — anon UPDATE contact_channels affected 0 rows (or RLS reject)';
  reset role;

  set local role authenticated;
  update public.contact_channels set label = 'deny check' where label = 'WhatsApp';
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — non-allowlist authenticated UPDATE touched % row(s).', v_count;
  end if;
  delete from public.contact_channels where label = 'WhatsApp';
  get diagnostics v_count = row_count;
  if v_count > 0 then
    raise exception 'FAIL — non-allowlist authenticated DELETE removed % row(s).', v_count;
  end if;
  raise notice 'PASS — non-allowlist authenticated UPDATE/DELETE affected 0 rows (RLS)';
  reset role;

  raise notice '==================================================';
  raise notice 'ALL CHECKS PASSED (public reads intact, writes allowlist-only)';
  raise notice '==================================================';
end $$;

-- ------------------------------------------------------------------------
-- Allowlisted-session SUCCESS path — manual, in-app (SQL editor has no JWT):
--   Since PR-B this write path is verified END-TO-END by the admin Contacto
--   UI: sign in at #/admin with the allowlisted account, open #/admin/
--   contacto, edit a channel (e.g. relabel WhatsApp), confirm it persists,
--   then revert it. Every mutation goes through the same anon client and RLS
--   policies checked above, gated on public.is_admin().
--   Any OTHER account gets 0 rows / an RLS denial in the network tab.
-- ------------------------------------------------------------------------
