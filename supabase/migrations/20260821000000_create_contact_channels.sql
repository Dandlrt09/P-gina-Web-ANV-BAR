-- supabase-contact-channels — storefront contact channels (slice A of
-- admin-contact-channels). Apply via Supabase SQL editor (or `supabase db push`
-- once linked).
-- Additive + idempotent: safe to re-run.
--
-- Scope: adds public.contact_channels, the editable replacement for the
-- build-time content/contact.json entries (label/handle/href/note/sort_order):
--   - RLS enabled; public reads for anon AND authenticated.
--   - Write policy trio each gated on public.is_admin() — NEVER blanket
--     `to authenticated` (exact pattern from 20260820000000_admin_products.sql).
--   - updated_at bump trigger reusing public.set_updated_at().
--
-- Domain rule: WhatsApp links are text-only E.164 wa.me format; the seeded
-- note preserves "Pedidos por mensaje de texto, sin llamadas".
-- RLS is the security boundary: the anon key ships in the bundle on purpose.

create table public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  handle text,
  href text not null,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_channels enable row level security;

-- ------------------------------------------------------------------------
-- Read policies — channels are public storefront content: any session may
-- read them (anon serves the landing page, authenticated serves the future
-- admin list). Public can read contact channels.
-- ------------------------------------------------------------------------

drop policy if exists "anon read contact channels" on public.contact_channels;
create policy "anon read contact channels" on public.contact_channels
  for select to anon using (true);

drop policy if exists "authenticated read contact channels" on public.contact_channels;
create policy "authenticated read contact channels" on public.contact_channels
  for select to authenticated using (true);

-- ------------------------------------------------------------------------
-- Write policies — allowlist only, same trio as products/categories.
-- Every write is gated on public.is_admin(); anon and non-allowlist
-- authenticated sessions get the default deny (0 rows / RLS rejection).
-- ------------------------------------------------------------------------

drop policy if exists "admin insert contact channels" on public.contact_channels;
create policy "admin insert contact channels" on public.contact_channels
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admin update contact channels" on public.contact_channels;
create policy "admin update contact channels" on public.contact_channels
  for update to authenticated
  using (public.is_admin());

drop policy if exists "admin delete contact channels" on public.contact_channels;
create policy "admin delete contact channels" on public.contact_channels
  for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------
-- updated_at bump — reuses public.set_updated_at() from
-- 20260820000000_admin_products.sql (this migration applies after it).
-- ------------------------------------------------------------------------

drop trigger if exists set_updated_at_on_contact_channels on public.contact_channels;
create trigger set_updated_at_on_contact_channels
  before update on public.contact_channels
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------
-- Seed — source of record content/contact.json (four storefront channels).
-- Guarded inserts keep re-runs safe: no unique constraint on label, so each
-- row is inserted only while its label does not exist yet.
-- ------------------------------------------------------------------------

insert into public.contact_channels (label, handle, href, note, sort_order)
select 'WhatsApp', '3186424021', 'https://wa.me/573186424021',
       'Pedidos por mensaje de texto, sin llamadas', 1
where not exists (select 1 from public.contact_channels where label = 'WhatsApp');

insert into public.contact_channels (label, handle, href, note, sort_order)
select 'Instagram', '@anv.bar_av', 'https://www.instagram.com/anv.bar_av', null, 2
where not exists (select 1 from public.contact_channels where label = 'Instagram');

insert into public.contact_channels (label, handle, href, note, sort_order)
select 'Facebook Marketplace', 'Facebook Marketplace',
       'https://www.facebook.com/marketplace', null, 3
where not exists (select 1 from public.contact_channels where label = 'Facebook Marketplace');

insert into public.contact_channels (label, handle, href, note, sort_order)
select 'Diseñadora', '@anysval_', 'https://www.instagram.com/anysval_', null, 4
where not exists (select 1 from public.contact_channels where label = 'Diseñadora');
