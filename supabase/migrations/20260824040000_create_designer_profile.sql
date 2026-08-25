-- supabase-designer-profile — singleton designer profile powering "La
-- Diseñadora" (slice 1 of designer-profile-supabase). Apply via Supabase SQL
-- editor (or `supabase db push` once linked).
-- Additive + idempotent: safe to re-run (policy drops + guarded publication).
--
-- Scope: adds public.designer_profile, the Supabase replacement for the
-- build-time content/designer.json section content:
--   - Singleton by construction: id integer PRIMARY KEY CHECK (id = 1), so a
--     second row is structurally impossible regardless of policies.
--   - Per-field char_length CHECKs mirror the JSON headroom from the spec
--     (name<=80, role<=120, bio<=1000, collection_name<=80,
--     collection_story<=2000, claim<=200 characters).
--   - RLS enabled; public reads for anon AND authenticated. The ONLY write
--     policy is an UPDATE gated on public.is_admin(). Deliberately NO
--     insert/delete policies: even admins cannot remove or recreate the
--     singleton — row lifecycle belongs exclusively to migrations.
--   - REPLICA IDENTITY FULL from day one (lesson from
--     20260824020000_product_reviews_replica_identity_full.sql): realtime
--     UPDATE payloads carry the whole row, so subscribers always refetch
--     with complete data.
--   - updated_at bump trigger reusing public.set_updated_at().
--   - Table added to the supabase_realtime publication inside a DO block
--     guarding pg_publication_tables (ALTER PUBLICATION ADD TABLE is not
--     idempotent).
--
-- RLS is the security boundary: the anon key ships in the bundle on purpose.

create table public.designer_profile (
  id integer primary key check (id = 1),
  name text not null check (char_length(name) between 1 and 80),
  role text not null check (char_length(role) between 1 and 120),
  bio text not null check (char_length(bio) between 1 and 1000),
  collection_name text not null check (char_length(collection_name) between 1 and 80),
  collection_story text not null check (char_length(collection_story) between 1 and 2000),
  claim text not null check (char_length(claim) between 1 and 200),
  updated_at timestamptz not null default now()
);

alter table public.designer_profile enable row level security;

-- Day-one replica identity: realtime UPDATE payloads carry the whole row.
alter table public.designer_profile replica identity full;

-- ------------------------------------------------------------------------
-- Read policies — the profile is public storefront content: any session may
-- read the singleton (anon serves the landing page, authenticated serves the
-- admin form). Same pair as testimonials/contact_channels.
-- ------------------------------------------------------------------------

drop policy if exists "anon read designer_profile" on public.designer_profile;
create policy "anon read designer_profile" on public.designer_profile
  for select to anon using (true);

drop policy if exists "authenticated read designer_profile" on public.designer_profile;
create policy "authenticated read designer_profile" on public.designer_profile
  for select to authenticated using (true);

-- ------------------------------------------------------------------------
-- ONLY write policy — allowlist-gated UPDATE. Deliberately NO insert/delete
-- policies: even admins cannot remove or recreate the singleton at runtime;
-- row lifecycle belongs exclusively to migrations.
-- ------------------------------------------------------------------------

drop policy if exists "admin update designer_profile" on public.designer_profile;
create policy "admin update designer_profile" on public.designer_profile
  for update to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------------------
-- updated_at bump — reuses public.set_updated_at() from
-- 20260820000000_admin_products.sql (this migration applies after it).
-- ------------------------------------------------------------------------

drop trigger if exists set_updated_at_on_designer_profile on public.designer_profile;
create trigger set_updated_at_on_designer_profile
  before update on public.designer_profile
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------
-- Realtime — deliver UPDATE events to subscribed clients so the storefront
-- reflects admin edits without a reload.
-- ------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'designer_profile'
  ) then
    alter publication supabase_realtime add table public.designer_profile;
  end if;
end $$;

-- ------------------------------------------------------------------------
-- Seed = EXACT current content/designer.json values, so the singleton never
-- starts empty and the database matches what the bundled fallback renders.
-- ON CONFLICT DO NOTHING keeps re-runs idempotent (never overwrites admin
-- edits applied after this migration first ran).
-- ------------------------------------------------------------------------

insert into public.designer_profile
  (id, name, role, bio, collection_name, collection_story, claim)
values
  (1,
   'Anays Vargas',
   'Diseñadora y fundadora de ANV·BAR',
   'Diseñadora caribeña de oficio y de nacimiento: crea piezas femeninas, ligeras y elegantes, cosidas a mano bajo pedido.',
   'RUBRA',
   'RUBRA nace del rojo de la trinitaria, la flor de tres pétalos que enciende los jardines del Caribe. Tres pétalos, tres intensidades y una misma ligereza: cada pieza atrapa ese juego de color y aire para vestir el día y la noche de quien la lleva.',
   'Donde la ligereza se convierte en elegancia')
on conflict (id) do nothing;
